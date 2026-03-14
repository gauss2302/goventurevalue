/**
 * Investor traction metrics: derived from monthly metrics and cohorts.
 * Used for Investor Snapshot, valuation multiples, and cohort analysis.
 */

export type StartupStage = 'idea' | 'early_growth' | 'scale'

export type MonthlyMetricRow = {
  month: string // YYYY-MM-DD (first of month)
  mrr: number | null
  newMrr: number | null
  expansionMrr: number | null
  contractionMrr: number | null
  churnedMrr: number | null
  customers: number | null
  newCustomers: number | null
  churnedCustomers: number | null
  gmv: number | null
  revenue: number | null
  grossProfit: number | null
  opex: number | null
  cashBalance: number | null
  headcount: number | null
  marketingSpend: number | null
}

export type CohortData = {
  cohortMonth: string
  cohortSize: number
  retentionByMonth: number[] // [M0, M1, M2, ...] 0-1
  revenueByMonth?: number[] // optional for NRR
}

export type DerivedTractionMetrics = {
  arr: number | null
  netNewMrr: number | null
  mrrGrowthRate: number | null
  logoChurn: number | null
  revenueChurn: number | null
  netRevenueRetention: number | null
  grossRetention: number | null
  cac: number | null
  arpu: number | null
  ltv: number | null
  ltvCac: number | null
  paybackMonths: number | null
  burnRate: number | null
  runwayMonths: number | null
  burnMultiple: number | null
  salesEfficiency: number | null // Magic Number
  grossMargin: number | null
}

const toNum = (v: number | null | undefined): number =>
  v != null && Number.isFinite(v) ? v : 0

const safeDiv = (a: number, b: number): number | null =>
  b > 0 && Number.isFinite(a) && Number.isFinite(b) ? a / b : null

/**
 * Compute derived traction metrics from a single month and optional previous month.
 */
export function computeDerivedMetrics(
  current: MonthlyMetricRow,
  previous: MonthlyMetricRow | null
): DerivedTractionMetrics {
  const mrr = toNum(current.mrr)
  const prevMrr = previous ? toNum(previous.mrr) : 0
  const newMrr = toNum(current.newMrr)
  const expansionMrr = toNum(current.expansionMrr)
  const contractionMrr = toNum(current.contractionMrr)
  const churnedMrr = toNum(current.churnedMrr)
  const customers = toNum(current.customers)
  const prevCustomers = previous ? toNum(previous.customers) : 0
  const newCustomers = toNum(current.newCustomers)
  const churnedCustomers = toNum(current.churnedCustomers)
  const revenue = toNum(current.revenue)
  const grossProfit = toNum(current.grossProfit)
  const opex = toNum(current.opex)
  const cashBalance = toNum(current.cashBalance)
  const marketingSpend = toNum(current.marketingSpend)

  const arr = mrr > 0 ? mrr * 12 : null
  const netNewMrr = prevMrr > 0 || mrr > 0
    ? newMrr + expansionMrr - contractionMrr - churnedMrr
    : null
  const mrrGrowthRate = prevMrr > 0 ? safeDiv(mrr - prevMrr, prevMrr) : null
  const logoChurn = prevCustomers > 0 ? safeDiv(churnedCustomers, prevCustomers) : null
  const revenueChurn = prevMrr > 0 ? safeDiv(churnedMrr, prevMrr) : null
  const netRevenueRetention = prevMrr > 0
    ? safeDiv(prevMrr + expansionMrr - contractionMrr - churnedMrr, prevMrr)
    : null
  const grossRetention = prevMrr > 0 ? safeDiv(prevMrr - churnedMrr, prevMrr) : null

  const cac = newCustomers > 0 ? safeDiv(marketingSpend, newCustomers) : null
  const arpu = customers > 0 ? safeDiv(mrr, customers) : null
  const monthlyChurnRate = revenueChurn != null ? revenueChurn : null
  const ltv = arpu != null && monthlyChurnRate != null && monthlyChurnRate > 0
    ? safeDiv(arpu, monthlyChurnRate)
    : arpu != null && monthlyChurnRate === 0
      ? null // infinite LTV
      : null
  const ltvCac = ltv != null && cac != null && cac > 0 ? safeDiv(ltv, cac) : null
  const grossMarginPct = revenue > 0 ? grossProfit / revenue : 0
  const paybackMonths = cac != null && arpu != null && arpu * grossMarginPct > 0
    ? safeDiv(cac, arpu * grossMarginPct)
    : null

  const burnRate = revenue >= 0 && opex >= 0 ? Math.max(0, opex - revenue) : null
  const runwayMonths = burnRate != null && burnRate > 0 && cashBalance >= 0
    ? safeDiv(cashBalance, burnRate)
    : null
  const netNewArr = netNewMrr != null ? netNewMrr * 12 : null
  const burnMultiple = netNewArr != null && netNewArr > 0 && burnRate != null && burnRate > 0
    ? safeDiv(burnRate, netNewMrr!)
    : null
  const salesEfficiency = marketingSpend > 0 && netNewArr != null
    ? safeDiv(netNewArr, marketingSpend)
    : null
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : null

  return {
    arr,
    netNewMrr,
    mrrGrowthRate,
    logoChurn,
    revenueChurn,
    netRevenueRetention,
    grossRetention,
    cac,
    arpu,
    ltv,
    ltvCac,
    paybackMonths,
    burnRate,
    runwayMonths,
    burnMultiple,
    salesEfficiency,
    grossMargin,
  }
}

/** Default ARR multiples by stage (pre-seed / seed / series A style) */
const DEFAULT_ARR_MULTIPLES: Record<StartupStage, { min: number; max: number; default: number }> = {
  idea: { min: 15, max: 25, default: 20 },
  early_growth: { min: 10, max: 20, default: 15 },
  scale: { min: 8, max: 15, default: 10 },
}

export type MultiplesValuationResult = {
  revenueBasedValuation: number
  arrBasedValuation: number
  blendedValuation: number
  arrMultipleUsed: number
  revenueMultipleUsed: number
}

/**
 * Valuation using revenue/ARR multiples. Uses stage defaults when multiples not provided.
 */
export function calculateMultiplesValuation(
  arr: number,
  options: {
    arrMultiple?: number | null
    revenueMultiple?: number | null
    stage?: StartupStage
  } = {}
): MultiplesValuationResult {
  const stage = options.stage ?? 'early_growth'
  const defaults = DEFAULT_ARR_MULTIPLES[stage]
  const arrMultipleUsed = options.arrMultiple != null && Number.isFinite(options.arrMultiple)
    ? options.arrMultiple
    : defaults.default
  const revenueMultipleUsed = options.revenueMultiple != null && Number.isFinite(options.revenueMultiple)
    ? options.revenueMultiple
    : arrMultipleUsed

  const arrBasedValuation = arr * arrMultipleUsed
  const annualRevenue = arr // ARR is annual
  const revenueBasedValuation = annualRevenue * revenueMultipleUsed
  const blendedValuation = (arrBasedValuation + revenueBasedValuation) / 2

  return {
    revenueBasedValuation,
    arrBasedValuation,
    blendedValuation,
    arrMultipleUsed,
    revenueMultipleUsed,
  }
}

export type CohortMetricsResult = {
  averageRetention: number[]
  weightedNRR: number
  medianPayback: number
}

/**
 * Aggregate cohort metrics: average retention curve, weighted NRR, median payback.
 */
export function calculateCohortMetrics(cohorts: CohortData[]): CohortMetricsResult {
  if (cohorts.length === 0) {
    return { averageRetention: [], weightedNRR: 0, medianPayback: 0 }
  }

  const maxMonths = Math.max(...cohorts.map((c) => c.retentionByMonth?.length ?? 0), 0)
  const averageRetention: number[] = []
  for (let m = 0; m < maxMonths; m++) {
    let sum = 0
    let count = 0
    for (const c of cohorts) {
      const v = c.retentionByMonth?.[m]
      if (v != null && Number.isFinite(v)) {
        sum += v
        count++
      }
    }
    averageRetention.push(count > 0 ? sum / count : 0)
  }

  let totalWeight = 0
  let nrrSum = 0
  for (const c of cohorts) {
    const rev = c.revenueByMonth
    if (!rev || rev.length < 2) continue
    const start = rev[0] || 0
    const end = rev[rev.length - 1] ?? 0
    if (start > 0) {
      const nrr = end / start
      const w = c.cohortSize
      nrrSum += nrr * w
      totalWeight += w
    }
  }
  const weightedNRR = totalWeight > 0 ? nrrSum / totalWeight : 0

  const paybacks: number[] = []
  for (const c of cohorts) {
    const ret = c.retentionByMonth ?? []
    for (let m = 0; m < ret.length; m++) {
      if (ret[m] != null && ret[m] < 0.5 && m > 0) {
        paybacks.push(m)
        break
      }
    }
  }
  paybacks.sort((a, b) => a - b)
  const medianPayback = paybacks.length > 0
    ? paybacks[Math.floor(paybacks.length / 2)]
    : 0

  return { averageRetention, weightedNRR, medianPayback }
}
