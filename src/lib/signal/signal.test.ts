import { describe, expect, it } from "vitest";

import {
  fromNullable,
  estimated,
  hasValue,
  isStale,
  measured,
  noData,
  NO_DATA_LABEL,
  publicView,
  SIGNAL_TTL_DAYS,
  type Provenance,
} from "@/lib/signal/index";
import { estimateRunwayMonths, FULLY_LOADED_COST_PER_HEAD_USD } from "@/lib/signal/runway";

const NOW = new Date("2026-08-07T00:00:00Z");

const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

const monthsAgo = (months: number) =>
  new Date(NOW.getTime() - months * 30.44 * 24 * 60 * 60 * 1000);

const freshProvenance = (asOf: Date = daysAgo(1)): Provenance => ({
  sourceKind: "ats_api",
  asOf,
});

// Rule 1 — a value never travels without its provenance.
describe("rule 1: provenance is inseparable from the value", () => {
  it("carries the as-of date on a measured value", () => {
    const asOf = daysAgo(3);
    const signal = measured(42, freshProvenance(asOf));

    expect(signal.kind).toBe("measured");
    if (signal.kind !== "measured") throw new Error("unreachable");
    expect(signal.provenance.asOf).toEqual(asOf);
  });

  it("distinguishes an estimate from a fact at the type level", () => {
    const fact = measured(10, freshProvenance());
    const guess = estimated({
      value: 10,
      method: "assumed burn",
      inputs: { headcount: 5 },
      confidence: "high",
      provenance: { sourceKind: "derived", asOf: daysAgo(1) },
    });

    // Same number, different kind — a renderer cannot conflate them.
    expect(fact.value).toBe(guess.value);
    expect(fact.kind).not.toBe(guess.kind);
  });
});

// Rule 2 — absence is a state, not zero.
describe("rule 2: missing data never becomes a number", () => {
  it("maps null to no_data rather than 0", () => {
    const signal = fromNullable<number>(null, freshProvenance());

    expect(signal).toEqual(noData("never_collected"));
    expect(hasValue(signal)).toBe(false);
  });

  it("maps a missing provenance to no_data even when a value exists", () => {
    // A number without a date is not a fact, so it must not be shown.
    expect(fromNullable(123, null)).toEqual(noData("never_collected"));
  });

  it("preserves a legitimate zero", () => {
    // Zero open roles is a real measurement and must survive.
    const signal = fromNullable(0, freshProvenance());

    expect(hasValue(signal)).toBe(true);
    if (!hasValue(signal)) throw new Error("unreachable");
    expect(signal.value).toBe(0);
  });

  it("gives every absence reason a user-facing explanation", () => {
    for (const label of Object.values(NO_DATA_LABEL)) {
      expect(label.trim().length).toBeGreaterThan(0);
      expect(label).not.toBe("—");
      expect(label).not.toBe("0");
    }
  });
});

// Rule 3 — a weak estimate makes no public claim.
describe("rule 3: low-confidence estimates stay internal", () => {
  it("withholds a low-confidence estimate from the public view", () => {
    const signal = estimated({
      value: 4,
      method: "assumed burn",
      inputs: {},
      confidence: "low",
      provenance: { sourceKind: "derived", asOf: daysAgo(1) },
    });

    expect(publicView({ signal, signalClass: "funding", now: NOW })).toEqual(
      noData("low_confidence"),
    );
  });

  it("publishes medium and high confidence estimates", () => {
    for (const confidence of ["medium", "high"] as const) {
      const signal = estimated({
        value: 4,
        method: "assumed burn",
        inputs: {},
        confidence,
        provenance: { sourceKind: "derived", asOf: daysAgo(1) },
      });

      expect(publicView({ signal, signalClass: "funding", now: NOW })).toEqual(signal);
    }
  });

  it("keeps the low-confidence value readable internally for ranking", () => {
    const signal = estimated({
      value: 4,
      method: "assumed burn",
      inputs: {},
      confidence: "low",
      provenance: { sourceKind: "derived", asOf: daysAgo(1) },
    });

    // Not published, but still usable where no claim is made to a user.
    expect(hasValue(signal)).toBe(true);
  });
});

// Rule 4 — runway needs all three inputs.
describe("rule 4: runway is never guessed", () => {
  const complete = {
    lastRaiseAmountUsd: 5_000_000,
    lastRaiseAt: monthsAgo(6),
    headcount: 20,
    headcountObservedAt: daysAgo(10),
  };

  it("estimates runway when all three inputs are present", () => {
    const signal = estimateRunwayMonths(complete, NOW);

    expect(signal.kind).toBe("estimated");
    if (signal.kind !== "estimated") throw new Error("unreachable");

    // $5M - (20 * 12k * 6mo) = $3.56M remaining, over $240k/mo ≈ 14.8 months.
    const monthlyBurn = 20 * FULLY_LOADED_COST_PER_HEAD_USD;
    expect(signal.value).toBeCloseTo((5_000_000 - monthlyBurn * 6) / monthlyBurn, 0);
  });

  it.each([
    ["raise amount", { lastRaiseAmountUsd: null }],
    ["raise date", { lastRaiseAt: null }],
    ["headcount", { headcount: null }],
    ["headcount date", { headcountObservedAt: null }],
  ])("refuses to estimate without %s", (_label, missing) => {
    expect(estimateRunwayMonths({ ...complete, ...missing }, NOW)).toEqual(
      noData("never_collected"),
    );
  });

  it("reports not_derivable instead of claiming zero months", () => {
    // Raise long since consumed by the assumed burn: in reality this means
    // revenue or an unreported round, so we must not print "0 months left".
    const signal = estimateRunwayMonths(
      { ...complete, lastRaiseAmountUsd: 500_000, lastRaiseAt: monthsAgo(24) },
      NOW,
    );

    expect(signal).toEqual(noData("not_derivable"));
  });

  it("discloses the method and inputs so the estimate is reproducible", () => {
    const signal = estimateRunwayMonths(complete, NOW);
    if (signal.kind !== "estimated") throw new Error("unreachable");

    expect(signal.method).toContain("fully loaded");
    expect(signal.method).toContain("Excludes revenue");
    expect(signal.inputs).toMatchObject({
      headcount: 20,
      costPerHeadUsd: FULLY_LOADED_COST_PER_HEAD_USD,
    });
  });

  it("degrades confidence as the estimate drifts from its inputs", () => {
    const fresh = estimateRunwayMonths(
      { ...complete, lastRaiseAmountUsd: 20_000_000, lastRaiseAt: monthsAgo(2) },
      NOW,
    );
    const drifted = estimateRunwayMonths(
      { ...complete, lastRaiseAmountUsd: 20_000_000, lastRaiseAt: monthsAgo(20) },
      NOW,
    );

    if (fresh.kind !== "estimated" || drifted.kind !== "estimated") {
      throw new Error("unreachable");
    }
    expect(fresh.confidence).toBe("high");
    expect(drifted.confidence).toBe("low");
  });

  it("dates the estimate by its stalest input", () => {
    const signal = estimateRunwayMonths(complete, NOW);
    if (signal.kind !== "estimated") throw new Error("unreachable");

    // The raise is older than the headcount observation, so it sets the date.
    expect(signal.provenance.asOf).toEqual(complete.lastRaiseAt);
  });
});

// Rule 5 — a dispute hides the value immediately.
describe("rule 5: a disputed value disappears before review", () => {
  it("hides a disputed measured value", () => {
    const signal = measured(120, freshProvenance());

    expect(
      publicView({ signal, signalClass: "headcount", isDisputed: true, now: NOW }),
    ).toEqual(noData("disputed"));
  });

  it("takes precedence over every other check", () => {
    // Fresh and high confidence, yet still withheld: the company's objection
    // outranks our confidence in our own number.
    const signal = estimated({
      value: 9,
      method: "assumed burn",
      inputs: {},
      confidence: "high",
      provenance: { sourceKind: "derived", asOf: NOW },
    });

    expect(
      publicView({ signal, signalClass: "funding", isDisputed: true, now: NOW }),
    ).toEqual(noData("disputed"));
  });
});

// Rule 6 — stale is not data.
describe("rule 6: values expire", () => {
  it.each(Object.keys(SIGNAL_TTL_DAYS) as Array<keyof typeof SIGNAL_TTL_DAYS>)(
    "expires %s past its TTL",
    (signalClass) => {
      const ttl = SIGNAL_TTL_DAYS[signalClass];
      const stale = measured(1, freshProvenance(daysAgo(ttl + 1)));
      const fresh = measured(1, freshProvenance(daysAgo(ttl - 1)));

      expect(publicView({ signal: stale, signalClass, now: NOW })).toEqual(noData("stale"));
      expect(publicView({ signal: fresh, signalClass, now: NOW })).toEqual(fresh);
    },
  );

  it("treats the TTL boundary as still valid", () => {
    const ttl = SIGNAL_TTL_DAYS.headcount;
    expect(isStale("headcount", daysAgo(ttl), NOW)).toBe(false);
    expect(isStale("headcount", daysAgo(ttl + 0.5), NOW)).toBe(true);
  });

  it("uses a different TTL per signal class", () => {
    // 120 days: dead for headcount, still live for funding.
    const signal = measured(1, freshProvenance(daysAgo(120)));

    expect(publicView({ signal, signalClass: "headcount", now: NOW })).toEqual(noData("stale"));
    expect(publicView({ signal, signalClass: "funding", now: NOW })).toEqual(signal);
  });
});

describe("publicView is the single gate", () => {
  it("passes no_data through unchanged", () => {
    const signal = noData("never_collected");
    expect(publicView({ signal, signalClass: "funding", now: NOW })).toEqual(signal);
  });

  it("orders dispute above confidence above staleness", () => {
    const staleLowConfidence = estimated({
      value: 1,
      method: "m",
      inputs: {},
      confidence: "low",
      provenance: { sourceKind: "derived", asOf: daysAgo(9999) },
    });

    // Low confidence is reported ahead of staleness: it says more about why the
    // number cannot be trusted.
    expect(publicView({ signal: staleLowConfidence, signalClass: "funding", now: NOW })).toEqual(
      noData("low_confidence"),
    );

    // And a dispute outranks both.
    expect(
      publicView({
        signal: staleLowConfidence,
        signalClass: "funding",
        isDisputed: true,
        now: NOW,
      }),
    ).toEqual(noData("disputed"));
  });
});
