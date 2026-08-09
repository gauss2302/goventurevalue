import {
  SIGNAL_TTL_DAYS,
  type Confidence,
  type EstimateInput,
  type Estimated,
  type Measured,
  type NoData,
  type NoDataReason,
  type Provenance,
  type Signal,
  type SignalClass,
} from "@/lib/signal/types";

export * from "@/lib/signal/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

export const measured = <T>(value: T, provenance: Provenance): Measured<T> => ({
  kind: "measured",
  value,
  provenance,
});

export const estimated = <T>(input: {
  value: T;
  method: string;
  inputs: Record<string, EstimateInput>;
  confidence: Confidence;
  provenance: Provenance;
}): Estimated<T> => ({
  kind: "estimated",
  value: input.value,
  method: input.method,
  inputs: input.inputs,
  confidence: input.confidence,
  provenance: input.provenance,
});

export const noData = (reason: NoDataReason): NoData => ({ kind: "no_data", reason });

/**
 * Builds a signal from a nullable database column.
 *
 * Rule 2: a missing value becomes `NoData`, never `0` and never a market
 * average standing in for a specific company. This is the helper that keeps
 * "just default it to zero" from ever being the convenient option.
 */
export const fromNullable = <T>(
  value: T | null | undefined,
  provenance: Provenance | null | undefined,
): Signal<T> => {
  if (value === null || value === undefined || !provenance) {
    return noData("never_collected");
  }
  return measured(value, provenance);
};

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

export const hasValue = <T>(signal: Signal<T>): signal is Measured<T> | Estimated<T> =>
  signal.kind !== "no_data";

export const isEstimate = <T>(signal: Signal<T>): signal is Estimated<T> =>
  signal.kind === "estimated";

/** Reads the value, or a fallback. Never invent a fallback for display — this is
 *  for internal computation (ranking, sorting), never for rendering. */
export const valueOr = <T>(signal: Signal<T>, fallback: T): T =>
  hasValue(signal) ? signal.value : fallback;

// ---------------------------------------------------------------------------
// Staleness (rule 6)
// ---------------------------------------------------------------------------

export const ageInDays = (asOf: Date, now: Date = new Date()): number =>
  (now.getTime() - asOf.getTime()) / MS_PER_DAY;

export const isStale = (
  signalClass: SignalClass,
  asOf: Date,
  now: Date = new Date(),
): boolean => ageInDays(asOf, now) > SIGNAL_TTL_DAYS[signalClass];

// ---------------------------------------------------------------------------
// Public view — the single gate every company-facing number passes through
// ---------------------------------------------------------------------------

/**
 * Reduces a stored signal to what may be shown publicly.
 *
 * The order of checks is deliberate and load-bearing:
 *
 *   1. Disputed first (rule 5). A company saying "this is wrong" removes the
 *      value immediately, before any curator looks at it. We would rather show
 *      nothing than argue with the subject of the data.
 *   2. Then low confidence (rule 3). Weak estimates stay internal; they can
 *      still inform ranking, they just cannot make a claim to a user.
 *   3. Then staleness (rule 6).
 *
 * Everything user-visible must pass through here. A component that renders a
 * raw stored signal has bypassed the contract.
 */
export const publicView = <T>(input: {
  signal: Signal<T>;
  signalClass: SignalClass;
  isDisputed?: boolean;
  now?: Date;
}): Signal<T> => {
  const { signal, signalClass, isDisputed = false, now = new Date() } = input;

  if (isDisputed) {
    return noData("disputed");
  }

  if (signal.kind === "no_data") {
    return signal;
  }

  if (signal.kind === "estimated" && signal.confidence === "low") {
    return noData("low_confidence");
  }

  if (isStale(signalClass, signal.provenance.asOf, now)) {
    return noData("stale");
  }

  return signal;
};

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** Copy for each absence reason. Never "—" or "0": absence gets an explanation. */
export const NO_DATA_LABEL: Record<NoDataReason, string> = {
  never_collected: "No data",
  stale: "No recent data",
  disputed: "Disputed by the company",
  low_confidence: "Not enough data",
  not_derivable: "Cannot be estimated",
};

export const describeNoData = (signal: NoData): string => NO_DATA_LABEL[signal.reason];
