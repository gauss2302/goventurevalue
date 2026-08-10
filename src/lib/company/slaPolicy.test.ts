import { describe, expect, it } from "vitest";

import {
  MIN_MEASURED_APPLICATIONS,
  SLA_MAX_WARNINGS,
  SLA_WARNING_DECAY_DAYS,
} from "@/config/brand";
import {
  canIssueWarningNow,
  currentWarningLevel,
  describeMark,
  nextWarningWindow,
  publishableRecord,
  sanctionsForLevel,
  shouldIssueWarning,
  warningWindowStart,
  type IssuedWarning,
} from "@/lib/company/slaPolicy";

/**
 * The enforcement policy.
 *
 * The properties worth protecting here are the ones that make a sanction fair:
 * a warning covers a week rather than an application, the ladder decays, and
 * nothing is published about a company on evidence too thin to publish.
 */

const day = (iso: string) => new Date(`${iso}T12:00:00Z`);

const warning = (iso: string): IssuedWarning => ({
  windowStart: warningWindowStart(day(iso)),
  issuedAt: day(iso),
});

describe("warning windows", () => {
  it("buckets a week to its Monday, in UTC", () => {
    // 2026-08-10 is a Monday.
    expect(warningWindowStart(day("2026-08-10"))).toBe("2026-08-10");
    expect(warningWindowStart(day("2026-08-13"))).toBe("2026-08-10");
    expect(warningWindowStart(day("2026-08-16"))).toBe("2026-08-10");
    // Sunday belongs to the week that started six days earlier, not the next one.
    expect(warningWindowStart(day("2026-08-09"))).toBe("2026-08-03");
  });

  it("rolls over a week after the window began", () => {
    expect(nextWarningWindow(day("2026-08-13")).toISOString()).toBe(
      "2026-08-17T00:00:00.000Z",
    );
  });

  it("issues one warning per window, however many breaches it holds", () => {
    // Per application, a busy company would burn the whole ladder in a day.
    expect(shouldIssueWarning({ breachesInWindow: 50, alreadyIssuedForWindow: false })).toBe(
      true,
    );
    expect(shouldIssueWarning({ breachesInWindow: 50, alreadyIssuedForWindow: true })).toBe(
      false,
    );
    expect(shouldIssueWarning({ breachesInWindow: 0, alreadyIssuedForWindow: false })).toBe(
      false,
    );
  });
});

describe("the ladder", () => {
  it("spaces rungs by real time, not by how often the sweep runs", () => {
    const now = day("2026-08-17");

    expect(canIssueWarningNow({ lastIssuedAt: null, now })).toBe(true);
    // An hour after the last warning: nothing, however many weeks are owed.
    expect(
      canIssueWarningNow({ lastIssuedAt: new Date(now.getTime() - 3_600_000), now }),
    ).toBe(false);
    expect(canIssueWarningNow({ lastIssuedAt: day("2026-08-11"), now })).toBe(false);
    // A full window later, the next rung is allowed.
    expect(canIssueWarningNow({ lastIssuedAt: day("2026-08-10"), now })).toBe(true);
  });

  it("counts warnings inside the decay horizon", () => {
    const now = day("2026-08-10");
    const stale = new Date(now.getTime() - (SLA_WARNING_DECAY_DAYS + 1) * 86_400_000);

    const level = currentWarningLevel(
      [
        { windowStart: "2026-01-01", issuedAt: stale },
        warning("2026-07-06"),
        warning("2026-08-03"),
      ],
      now,
    );

    // The expired one no longer counts: the ladder must not be a ratchet.
    expect(level).toBe(2);
  });

  it("escalates in the order that was agreed", () => {
    expect(sanctionsForLevel(0)).toMatchObject({
      publicMark: false,
      publishBlocked: false,
      suspended: false,
      warningsRemaining: 4,
    });
    expect(sanctionsForLevel(1)).toMatchObject({ publicMark: false, publishBlocked: false });
    // Two separate weeks is a pattern, and candidates are told.
    expect(sanctionsForLevel(2)).toMatchObject({ publicMark: true, publishBlocked: false });
    // Still failing to answer the roles it has: no new ones.
    expect(sanctionsForLevel(3)).toMatchObject({ publicMark: true, publishBlocked: true });
    expect(sanctionsForLevel(SLA_MAX_WARNINGS)).toMatchObject({
      suspended: true,
      warningsRemaining: 0,
    });
  });
});

describe("what we are willing to publish", () => {
  it("says nothing at all below the minimum sample", () => {
    const record = publishableRecord({
      answered: 1,
      breached: 0,
      medianFirstResponseHours: 0,
    });

    // "100%, under an hour" from one reply is as confident as "0%" from none.
    expect(record.responseRate).toBeNull();
    expect(record.medianFirstResponseHours).toBeNull();
    expect(record.measured).toBe(1);
  });

  it("publishes once there is enough to stand behind", () => {
    const record = publishableRecord({
      answered: MIN_MEASURED_APPLICATIONS - 1,
      breached: 1,
      medianFirstResponseHours: 30,
    });

    expect(record.responseRate).toBeCloseTo((MIN_MEASURED_APPLICATIONS - 1) / MIN_MEASURED_APPLICATIONS);
    expect(record.medianFirstResponseHours).toBe(30);
  });

  it("counts nothing when nothing has resolved", () => {
    const record = publishableRecord({
      answered: 0,
      breached: 0,
      medianFirstResponseHours: null,
    });

    expect(record.responseRate).toBeNull();
    expect(record.measured).toBe(0);
  });
});

describe("the mark a candidate sees", () => {
  it("stays silent below the marking level", () => {
    expect(describeMark({ level: 1, breached: 1, measured: 9, companyName: "Acme" })).toBeNull();
  });

  it("carries the numbers behind it", () => {
    const mark = describeMark({ level: 2, breached: 3, measured: 12, companyName: "Acme" })!;

    expect(mark.headline).toContain("Acme");
    expect(mark.detail).toContain("3 of the last 12");
    expect(mark.detail).toContain(`after ${SLA_MAX_WARNINGS}`);
  });

  it("does not borrow a rate it is not willing to publish", () => {
    const mark = describeMark({ level: 2, breached: 2, measured: 2, companyName: "Acme" })!;

    expect(mark.detail).toContain("2 separate weeks");
    expect(mark.detail).toContain("too few applications");
    expect(mark.detail).not.toContain("of the last");
  });

  it("says plainly when the roles are gone", () => {
    const mark = describeMark({
      level: SLA_MAX_WARNINGS,
      breached: 6,
      measured: 10,
      companyName: "Acme",
    })!;

    expect(mark.headline).toContain("suspended");
    expect(mark.detail).toContain("no longer listed");
  });
});
