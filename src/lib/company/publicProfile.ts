import {
  fromNullable,
  measured,
  noData,
  publicView,
  type Signal,
} from "@/lib/signal/index";
import { estimateRunwayMonths } from "@/lib/signal/runway";
import type { company, companyEstimate, companySignal } from "@/db/schema";

/**
 * The company as a candidate sees it (docs/PRODUCT_PLAN.md §1.4 ①, §6.4).
 *
 * Every number here passes through `publicView`, so disputes, weak estimates and
 * stale values fall out before rendering. What remains is either a fact with a
 * date on it or an explicit absence — never a guess dressed as either.
 *
 * Expect a lot of `NoData` today: funding history and headcount time series are
 * populated by the prospecting pipeline, which is not built yet. That is the
 * correct output, not a gap to paper over — a candidate is better served by
 * "no data" than by a plausible number we cannot stand behind.
 */

type CompanyRow = typeof company.$inferSelect;
type SignalRow = typeof companySignal.$inferSelect;
type EstimateRow = typeof companyEstimate.$inferSelect;

export type CompanySignals = {
  teamSize: Signal<number>;
  monthsSinceLastRaise: Signal<number>;
  teamGrowthRate90d: Signal<number>;
  openRoles: Signal<number>;
  runwayMonths: Signal<number>;
};

export type ResponseRecord = {
  /**
   * Null when nothing is publishable.
   *
   * Two different nulls, which is why `measured` travels with it: nothing
   * resolved yet, or too little resolved to publish (§6.4, MIN_MEASURED_APPLICATIONS).
   * The reader is told which.
   */
  responseRate: number | null;
  medianFirstResponseHours: number | null;
  slaResponseDays: number | null;
  /** Resolved applications behind the figures — the denominator. */
  measured: number;
  breached: number;
  /** Warnings for missing deadlines. Drives the public mark from level 2. */
  warningLevel: number;
  markedAt: Date | null;
};

export const buildCompanySignals = (input: {
  company: CompanyRow;
  signal?: SignalRow | null;
  estimates?: EstimateRow[];
  lastFunding?: { amountUsd: number | null; announcedAt: Date | null } | null;
  now?: Date;
}): CompanySignals => {
  const { company: row, signal, estimates = [], lastFunding, now = new Date() } = input;

  const isDisputed = (key: string) =>
    estimates.some((estimate) => estimate.key === key && estimate.isDisputed);

  const teamSize = publicView({
    signal: fromNullable(
      row.teamSize,
      row.teamSizeUpdatedAt
        ? { sourceKind: "company_claimed", asOf: row.teamSizeUpdatedAt }
        : null,
    ),
    signalClass: "headcount",
    isDisputed: isDisputed("team_size"),
    now,
  });

  const monthsSinceLastRaise = publicView({
    signal: fromNullable(
      signal?.monthsSinceLastRaise ?? null,
      signal?.monthsSinceLastRaiseAsOf
        ? { sourceKind: "derived", asOf: signal.monthsSinceLastRaiseAsOf }
        : null,
    ),
    signalClass: "funding",
    now,
  });

  const teamGrowthRate90d = publicView({
    signal: fromNullable(
      signal?.teamGrowthRate90d === null || signal?.teamGrowthRate90d === undefined
        ? null
        : Number(signal.teamGrowthRate90d),
      signal?.teamGrowthRate90dAsOf
        ? { sourceKind: "derived", asOf: signal.teamGrowthRate90dAsOf }
        : null,
    ),
    signalClass: "headcount",
    now,
  });

  // Open roles are counted live from published rows, so this is a measurement
  // taken now rather than a cached derivation.
  const openRoles = publicView({
    signal:
      signal?.openRolesCount === null || signal?.openRolesCount === undefined
        ? noData("never_collected")
        : measured(signal.openRolesCount, {
            sourceKind: "derived",
            asOf: signal.openRolesCountAsOf ?? signal.computedAt,
          }),
    signalClass: "hiring_activity",
    now,
  });

  // Rule 4: all three inputs or nothing. Missing funding data is the norm until
  // the prospecting pipeline runs, so this is usually NoData — deliberately.
  const runwayMonths = publicView({
    signal: estimateRunwayMonths(
      {
        lastRaiseAmountUsd: lastFunding?.amountUsd ?? null,
        lastRaiseAt: lastFunding?.announcedAt ?? null,
        headcount: row.teamSize,
        headcountObservedAt: row.teamSizeUpdatedAt,
      },
      now,
    ),
    signalClass: "funding",
    isDisputed: isDisputed("runway_months"),
    now,
  });

  return { teamSize, monthsSinceLastRaise, teamGrowthRate90d, openRoles, runwayMonths };
};

export const buildResponseRecord = (row: CompanyRow): ResponseRecord => ({
  // Already withheld at write time by `publishableRecord`, so a non-null value
  // here has passed the minimum-sample rule; the counts come along so the
  // interface can distinguish "nothing yet" from "not enough yet".
  responseRate: row.responseRate30d === null ? null : Number(row.responseRate30d),
  medianFirstResponseHours: row.medianFirstResponseHours,
  slaResponseDays: row.slaResponseDays,
  measured: row.slaMeasuredCount,
  breached: row.slaBreachCount,
  warningLevel: row.slaWarningLevel,
  markedAt: row.slaMarkedAt,
});

/**
 * How a salary band should read to a candidate.
 *
 * A withheld band is stated as withheld. We never widen, estimate or infer one
 * from the market — a number the company did not give is not theirs to be held
 * to (§6.4 rule 2).
 */
export const formatSalaryBand = (role: {
  salaryIsPublic: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
}): string => {
  if (!role.salaryIsPublic || (role.salaryMin === null && role.salaryMax === null)) {
    return "Not disclosed";
  }

  const currency = role.salaryCurrency ?? "USD";
  const format = (value: number) => `${currency === "USD" ? "$" : ""}${value.toLocaleString("en-US")}`;

  if (role.salaryMin !== null && role.salaryMax !== null) {
    return `${format(role.salaryMin)} – ${format(role.salaryMax)}`;
  }

  return role.salaryMin !== null
    ? `From ${format(role.salaryMin)}`
    : `Up to ${format(role.salaryMax!)}`;
};
