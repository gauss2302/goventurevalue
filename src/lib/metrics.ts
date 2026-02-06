/**
 * Canonical mapping between camelCase (DB/API) and snake_case (dashboard/snapshots)
 * for metric keys. Use when reading/writing metric_snapshots and displaying dashboard stage metrics.
 */
export const CAMEL_TO_SNAKE: Record<string, string> = {
  usersTotal: "users_total",
  dau: "dau",
  mau: "mau",
  growthRate: "growth_rate",
  activationRate: "activation_rate",
  retentionRate: "retention_rate",
  churnRate: "churn_rate",
  dauMauRatio: "dau_mau",
  mrr: "mrr",
  arr: "arr",
  arpu: "arpu",
  revenueGrowthRate: "revenue_growth",
  expansionRevenue: "expansion_revenue",
  contractionRevenue: "contraction_revenue",
  cac: "cac",
  ltv: "ltv",
  ltvCac: "ltv_cac",
  paybackPeriodMonths: "payback_period",
  conversionRate: "conversion_rate",
  cpl: "cpl",
  salesCycleLengthDays: "sales_cycle",
  winRate: "win_rate",
  featureAdoptionRate: "feature_adoption",
  timeToValueDays: "time_to_value",
  nps: "nps",
  burnRate: "burn_rate",
  runwayMonths: "runway",
  grossMargin: "gross_margin",
  operatingMargin: "operating_margin",
};

export const SNAKE_TO_CAMEL: Record<string, string> = Object.fromEntries(
  Object.entries(CAMEL_TO_SNAKE).map(([c, s]) => [s, c])
);

/** Convert API/DB camelCase key to snapshot/dashboard snake_case key */
export function toSnapshotKey(camelKey: string): string {
  return CAMEL_TO_SNAKE[camelKey] ?? camelKey;
}

/** Convert snapshot/dashboard snake_case key to API/DB camelCase key */
export function fromSnapshotKey(snakeKey: string): string {
  return SNAKE_TO_CAMEL[snakeKey] ?? snakeKey;
}

/** All camelCase metric keys that can be synced to snapshots */
export const METRIC_CAMEL_KEYS = Object.keys(CAMEL_TO_SNAKE) as (keyof typeof CAMEL_TO_SNAKE)[];
