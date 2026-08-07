import { estimated, noData, type Confidence, type Signal } from "@/lib/signal/index";

/**
 * Runway estimation (docs/PRODUCT_PLAN.md §6.4 rule 4).
 *
 * The single most useful number for a candidate weighing a startup, and the most
 * dangerous one for us to get wrong. Rule 4 therefore sets a higher bar than any
 * other signal: all three inputs must be present, and runway is never inferred
 * from funding stage alone.
 */

/**
 * Fully-loaded monthly cost per head, USD.
 *
 * A blunt industry heuristic for US/EU seed and Series A startups, covering
 * salary, payroll tax, benefits and the usual per-head overhead. It is stated
 * here as a named constant precisely because rule 3 requires the method to be
 * disclosable to the user — an assumption we will not show is an assumption we
 * should not make.
 */
export const FULLY_LOADED_COST_PER_HEAD_USD = 12_000;

const MS_PER_MONTH = 30.44 * 24 * 60 * 60 * 1000;

/** Beyond this, the estimate has drifted too far from its inputs to publish. */
const LOW_CONFIDENCE_AFTER_MONTHS = 18;
const HIGH_CONFIDENCE_RAISE_MONTHS = 12;
const HIGH_CONFIDENCE_HEADCOUNT_DAYS = 30;

export type RunwayInputs = {
  lastRaiseAmountUsd: number | null | undefined;
  lastRaiseAt: Date | null | undefined;
  headcount: number | null | undefined;
  headcountObservedAt: Date | null | undefined;
};

const monthsBetween = (from: Date, to: Date): number =>
  (to.getTime() - from.getTime()) / MS_PER_MONTH;

const resolveConfidence = (input: {
  elapsedMonths: number;
  headcountAgeDays: number;
}): Confidence => {
  if (input.elapsedMonths > LOW_CONFIDENCE_AFTER_MONTHS) {
    return "low";
  }

  if (
    input.elapsedMonths <= HIGH_CONFIDENCE_RAISE_MONTHS &&
    input.headcountAgeDays <= HIGH_CONFIDENCE_HEADCOUNT_DAYS
  ) {
    return "high";
  }

  return "medium";
};

/**
 * Estimates months of runway remaining.
 *
 * Returns `NoData` rather than a number whenever honesty requires it:
 *   - any of the three inputs missing → `never_collected` (rule 4);
 *   - the model implies cash already exhausted → `not_derivable`, because in
 *     reality that means revenue, a bridge, or an unreported round, and printing
 *     "0 months" would be a false and damaging claim.
 *
 * A `low` confidence result is returned as-is; `publicView` is what withholds it
 * from users, so ranking can still use it.
 */
export const estimateRunwayMonths = (
  inputs: RunwayInputs,
  now: Date = new Date(),
): Signal<number> => {
  const { lastRaiseAmountUsd, lastRaiseAt, headcount, headcountObservedAt } = inputs;

  // Rule 4: all three inputs, or nothing.
  if (
    lastRaiseAmountUsd === null ||
    lastRaiseAmountUsd === undefined ||
    !lastRaiseAt ||
    headcount === null ||
    headcount === undefined ||
    !headcountObservedAt
  ) {
    return noData("never_collected");
  }

  if (lastRaiseAmountUsd <= 0 || headcount <= 0) {
    return noData("not_derivable");
  }

  const elapsedMonths = Math.max(0, monthsBetween(lastRaiseAt, now));
  const monthlyBurnUsd = headcount * FULLY_LOADED_COST_PER_HEAD_USD;
  const remainingUsd = lastRaiseAmountUsd - monthlyBurnUsd * elapsedMonths;

  if (remainingUsd <= 0) {
    return noData("not_derivable");
  }

  const runwayMonths = remainingUsd / monthlyBurnUsd;
  const headcountAgeDays = (now.getTime() - headcountObservedAt.getTime()) / (24 * 60 * 60 * 1000);

  return estimated({
    value: Math.round(runwayMonths * 10) / 10,
    method:
      `Last raise of $${lastRaiseAmountUsd.toLocaleString("en-US")} minus an assumed burn of ` +
      `${headcount} people x $${FULLY_LOADED_COST_PER_HEAD_USD.toLocaleString("en-US")}/month ` +
      `fully loaded, over the ${Math.round(elapsedMonths)} months since that raise. ` +
      `Excludes revenue and any unannounced funding.`,
    inputs: {
      lastRaiseAmountUsd,
      lastRaiseAt: lastRaiseAt.toISOString(),
      headcount,
      headcountObservedAt: headcountObservedAt.toISOString(),
      costPerHeadUsd: FULLY_LOADED_COST_PER_HEAD_USD,
      elapsedMonths: Math.round(elapsedMonths * 10) / 10,
      monthlyBurnUsd,
    },
    confidence: resolveConfidence({ elapsedMonths, headcountAgeDays }),
    provenance: {
      sourceKind: "derived",
      // An estimate is only as current as its stalest input.
      asOf: lastRaiseAt < headcountObservedAt ? lastRaiseAt : headcountObservedAt,
    },
  });
};
