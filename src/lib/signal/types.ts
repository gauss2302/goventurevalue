/**
 * The data honesty contract (docs/PRODUCT_PLAN.md §6.4).
 *
 * Rule 1 — a value does not exist without its provenance. That is enforced here
 * rather than by convention: a signal is a discriminated union, so a renderer
 * receiving `Signal<T>` cannot reach a number without also having the date it
 * was true and whether it is a fact or an estimate. Forgetting to show "as of"
 * is a type error, not a review comment.
 *
 * Why this matters commercially, not just aesthetically: runway and headcount
 * are estimates, and the first time a founder can say "you published that we
 * have four months of runway and you were wrong" costs more trust than the
 * feature ever earned (§10).
 */

export type ProvenanceKind =
  | "ats_api"
  | "funding_db"
  | "company_claimed"
  | "derived"
  | "user_reported";

export type Confidence = "high" | "medium" | "low";

export type NoDataReason =
  /** Never collected for this company. */
  | "never_collected"
  /** Past its TTL — rule 6 says stale is not data. */
  | "stale"
  /** The company disputed it; hidden immediately, before review (rule 5). */
  | "disputed"
  /** Below the confidence bar for public display (rule 3). */
  | "low_confidence"
  /**
   * Inputs were present but the model does not apply to this company — e.g. the
   * runway model implies negative cash, which really means they have revenue, a
   * bridge, or an unreported round. Saying "0 months" here would be a false
   * claim, so we say nothing.
   */
  | "not_derivable";

export type Provenance = {
  sourceKind: ProvenanceKind;
  sourceUrl?: string;
  /** When the value was true — not when the row was written. */
  asOf: Date;
};

export type Measured<T> = {
  kind: "measured";
  value: T;
  provenance: Provenance;
};

export type Estimated<T> = {
  kind: "estimated";
  value: T;
  /** Human-readable description of how the value was derived (rule 3). */
  method: string;
  /** Exact inputs, so any estimate can be reproduced and audited. */
  inputs: Record<string, unknown>;
  confidence: Confidence;
  provenance: Provenance;
};

export type NoData = {
  kind: "no_data";
  reason: NoDataReason;
};

export type Signal<T> = Measured<T> | Estimated<T> | NoData;

/**
 * Signal classes and how long a value of each class stays meaningful.
 *
 * Rule 6: past its TTL a value silently becomes `NoData`, because a two-year-old
 * headcount presented as current is a lie told by omission.
 */
export type SignalClass = "funding" | "headcount" | "response_time" | "hiring_activity";

export const SIGNAL_TTL_DAYS: Record<SignalClass, number> = {
  funding: 180,
  headcount: 90,
  response_time: 60,
  hiring_activity: 30,
};
