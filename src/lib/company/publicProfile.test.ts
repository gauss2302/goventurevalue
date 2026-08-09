import { describe, expect, it } from "vitest";

import { buildCompanySignals, formatSalaryBand } from "@/lib/company/publicProfile";

const NOW = new Date("2026-08-08T00:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000);

const baseCompany = {
  teamSize: null,
  teamSizeUpdatedAt: null,
  responseRate30d: null,
  medianFirstResponseHours: null,
  slaResponseDays: 7,
} as never;

const withCompany = (overrides: Record<string, unknown>) =>
  ({ ...(baseCompany as object), ...overrides }) as never;

describe("company signals shown to candidates", () => {
  it("says nothing rather than guessing when there is no data", () => {
    // The expected state until the prospecting pipeline runs. A candidate is
    // better served by "no data" than by a number we cannot stand behind.
    const signals = buildCompanySignals({ company: baseCompany, now: NOW });

    expect(signals.teamSize.kind).toBe("no_data");
    expect(signals.monthsSinceLastRaise.kind).toBe("no_data");
    expect(signals.runwayMonths.kind).toBe("no_data");
  });

  it("shows a headcount that came with a date", () => {
    const signals = buildCompanySignals({
      company: withCompany({ teamSize: 14, teamSizeUpdatedAt: daysAgo(10) }),
      now: NOW,
    });

    expect(signals.teamSize.kind).toBe("measured");
    if (signals.teamSize.kind !== "measured") throw new Error("unreachable");
    expect(signals.teamSize.value).toBe(14);
    expect(signals.teamSize.provenance.asOf).toEqual(daysAgo(10));
  });

  it("withholds a headcount without a date", () => {
    // A number with no "as of" is not a fact (§6.4 rule 1).
    const signals = buildCompanySignals({
      company: withCompany({ teamSize: 14, teamSizeUpdatedAt: null }),
      now: NOW,
    });

    expect(signals.teamSize.kind).toBe("no_data");
  });

  it("expires a headcount past its TTL", () => {
    const signals = buildCompanySignals({
      company: withCompany({ teamSize: 14, teamSizeUpdatedAt: daysAgo(200) }),
      now: NOW,
    });

    expect(signals.teamSize).toEqual({ kind: "no_data", reason: "stale" });
  });

  it("hides a disputed value immediately", () => {
    const signals = buildCompanySignals({
      company: withCompany({ teamSize: 14, teamSizeUpdatedAt: daysAgo(5) }),
      estimates: [{ key: "team_size", isDisputed: true } as never],
      now: NOW,
    });

    expect(signals.teamSize).toEqual({ kind: "no_data", reason: "disputed" });
  });

  it("estimates runway only with all three inputs, and labels it an estimate", () => {
    const signals = buildCompanySignals({
      company: withCompany({ teamSize: 12, teamSizeUpdatedAt: daysAgo(5) }),
      lastFunding: { amountUsd: 8_000_000, announcedAt: daysAgo(120) },
      now: NOW,
    });

    expect(signals.runwayMonths.kind).toBe("estimated");
    if (signals.runwayMonths.kind !== "estimated") throw new Error("unreachable");
    expect(signals.runwayMonths.method).toContain("Excludes revenue");
  });

  it("withholds runway when the raise is unknown", () => {
    const signals = buildCompanySignals({
      company: withCompany({ teamSize: 12, teamSizeUpdatedAt: daysAgo(5) }),
      lastFunding: { amountUsd: null, announcedAt: null },
      now: NOW,
    });

    expect(signals.runwayMonths.kind).toBe("no_data");
  });
});

describe("salary band as a candidate reads it", () => {
  it("states a withheld band as withheld", () => {
    // Never widened, estimated or inferred from the market: a number the company
    // did not give is not theirs to be held to.
    expect(
      formatSalaryBand({
        salaryIsPublic: false,
        salaryMin: 140_000,
        salaryMax: 180_000,
        salaryCurrency: "USD",
      }),
    ).toBe("Not disclosed");

    expect(
      formatSalaryBand({
        salaryIsPublic: true,
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: null,
      }),
    ).toBe("Not disclosed");
  });

  it("renders a full band", () => {
    expect(
      formatSalaryBand({
        salaryIsPublic: true,
        salaryMin: 140_000,
        salaryMax: 180_000,
        salaryCurrency: "USD",
      }),
    ).toBe("$140,000 – $180,000");
  });

  it("renders an open-ended band honestly", () => {
    expect(
      formatSalaryBand({
        salaryIsPublic: true,
        salaryMin: 140_000,
        salaryMax: null,
        salaryCurrency: "USD",
      }),
    ).toBe("From $140,000");

    expect(
      formatSalaryBand({
        salaryIsPublic: true,
        salaryMin: null,
        salaryMax: 180_000,
        salaryCurrency: "USD",
      }),
    ).toBe("Up to $180,000");
  });
});
