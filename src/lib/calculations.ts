export type ScenarioParams = {
  userGrowth: number;
  arpu: number;
  churnRate: number;
  cac: number;
  expansionRate: number;
  grossMarginTarget: number;
  revenueGrowthRate: number;
};

export type CostStructure = {
  hostingCostPerUser: number;
  paymentProcessingRate: number;
  supportCostPerUser: number;
  rdByYear: number[];
  gnaByYear: number[];
};

export type ModelSettings = {
  startUsers: number;
  taxRate: number;
  discountRate: number;
  terminalGrowth: number;
  safetyBuffer: number;
  personnelByYear: number[];
  employeesByYear: number[];
  capexByYear: number[];
  depreciationByYear: number[];
  projectionYears: number[];
  monthlyBurnRate?: number | null;
  currentCash?: number | null;
  revenueMultiple?: number | null;
  arrMultiple?: number | null;
  costStructure?: CostStructure | null;
  growthModel?: 'linear' | 'scurve';
  scurveCarryingCapacity?: number | null;
  /** @deprecated kept for backward compat during migration */
  startFarmers?: number;
};

export type ProjectionData = {
  year: number;
  users: number;
  mau: number;
  newUsers: number;
  subscriptionRevenue: number;
  expansionRevenue: number;
  totalRevenue: number;
  hostingCosts: number;
  paymentProcessing: number;
  customerSupport: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  personnel: number;
  employees: number;
  marketing: number;
  rd: number;
  gna: number;
  opex: number;
  ebitda: number;
  ebitdaMargin: number;
  capex: number;
  depreciation: number;
  ebit: number;
  taxes: number;
  netIncome: number;
  accountsReceivable: number;
  accountsPayable: number;
  workingCapital: number;
  operatingCF: number;
  investingCF: number;
  freeCashFlow: number;
  ltv: number;
  ltvCac: number;
  paybackMonths: number;
  revenuePerEmployee: number;
  marketShare: number;
};

export type MarketSizing = {
  tam: number;
  tamDescription: string;
  sam: number;
  samDescription: string;
  som: number[];
  somDescription: string;
};

export type TractionSeed = {
  latestMrr: number;
  latestCustomers: number;
  latestChurnRate: number | null;
  latestArpu: number | null;
};

export const DEFAULT_COST_STRUCTURE: CostStructure = {
  hostingCostPerUser: 0.5,
  paymentProcessingRate: 0.03,
  supportCostPerUser: 0.2,
  rdByYear: [25000, 40000, 60000, 85000, 115000],
  gnaByYear: [12000, 18000, 28000, 40000, 55000],
};

export const DEFAULT_SETTINGS: ModelSettings = {
  startUsers: 100,
  taxRate: 0.12,
  discountRate: 0.30,
  terminalGrowth: 0.03,
  safetyBuffer: 50000,
  personnelByYear: [36000, 72000, 144000, 216000, 288000],
  employeesByYear: [2, 4, 8, 12, 16],
  capexByYear: [15000, 10000, 20000, 15000, 10000],
  depreciationByYear: [3750, 6250, 11250, 15000, 13750],
  projectionYears: [2026, 2027, 2028, 2029, 2030],
  costStructure: DEFAULT_COST_STRUCTURE,
  growthModel: 'linear',
};

export const DEFAULT_MARKET_SIZING: MarketSizing = {
  tam: 0,
  tamDescription: '',
  sam: 0,
  samDescription: '',
  som: [0, 0, 0, 0, 0],
  somDescription: '',
};

const toFiniteNumber = (value: number, fallback = 0): number =>
  Number.isFinite(value) ? value : fallback;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const normalizeRate = (
  value: number,
  options: { min: number; max: number }
): number => {
  const raw = toFiniteNumber(value, 0);
  const asFraction = Math.abs(raw) > 1 ? raw / 100 : raw;
  return clamp(asFraction, options.min, options.max);
};

const toPercent = (numerator: number, denominator: number): number => {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return (numerator / denominator) * 100;
};

const toRatio = (numerator: number, denominator: number): number => {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return numerator / denominator;
};

const normalizeScenario = (scenario: ScenarioParams): ScenarioParams => ({
  userGrowth: normalizeRate(scenario.userGrowth, { min: -0.95, max: 3 }),
  arpu: Math.max(0, toFiniteNumber(scenario.arpu, 0)),
  churnRate: normalizeRate(scenario.churnRate, { min: 0.001, max: 0.95 }),
  cac: Math.max(0, toFiniteNumber(scenario.cac, 0)),
  expansionRate: normalizeRate(scenario.expansionRate, { min: 0, max: 1 }),
  grossMarginTarget: normalizeRate(scenario.grossMarginTarget, { min: 0, max: 0.99 }),
  revenueGrowthRate: normalizeRate(scenario.revenueGrowthRate, { min: -0.95, max: 5 }),
});

const normalizeSettings = (settings: ModelSettings): ModelSettings => {
  const discountRate = normalizeRate(settings.discountRate, {
    min: 0.01,
    max: 0.95,
  });
  const terminalGrowthRaw = normalizeRate(settings.terminalGrowth, {
    min: -0.2,
    max: 0.2,
  });
  const terminalGrowth =
    terminalGrowthRaw >= discountRate
      ? Math.max(-0.2, Number((discountRate - 0.01).toFixed(4)))
      : terminalGrowthRaw;

  return {
    ...settings,
    startUsers: Math.max(0, Math.round(toFiniteNumber(settings.startUsers, 0))),
    taxRate: normalizeRate(settings.taxRate, { min: 0, max: 0.9 }),
    discountRate,
    terminalGrowth,
    safetyBuffer: Math.max(0, Math.round(toFiniteNumber(settings.safetyBuffer, 0))),
    personnelByYear: settings.personnelByYear.map((v) =>
      Math.max(0, Math.round(toFiniteNumber(v, 0)))
    ),
    employeesByYear: settings.employeesByYear.map((v) =>
      Math.max(0, Math.round(toFiniteNumber(v, 0)))
    ),
    capexByYear: settings.capexByYear.map((v) =>
      Math.max(0, Math.round(toFiniteNumber(v, 0)))
    ),
    depreciationByYear: settings.depreciationByYear.map((v) =>
      Math.max(0, Math.round(toFiniteNumber(v, 0)))
    ),
  };
};

const normalizeMarketSizing = (marketSizing: MarketSizing): MarketSizing => ({
  ...marketSizing,
  tam: Math.max(0, Math.round(toFiniteNumber(marketSizing.tam, 0))),
  sam: Math.max(1, Math.round(toFiniteNumber(marketSizing.sam, 1))),
  som: marketSizing.som.map((v) => Math.max(0, Math.round(toFiniteNumber(v, 0)))),
});

function computeScurveUsers(
  startUsers: number,
  growthRate: number,
  yearIndex: number,
  carryingCapacity: number
): number {
  const K = carryingCapacity;
  const P0 = startUsers;
  const r = growthRate;
  const t = yearIndex + 1;
  return Math.round(K / (1 + ((K - P0) / P0) * Math.exp(-r * t)));
}

export function calculateProjections(
  scenario: ScenarioParams,
  settings: ModelSettings = DEFAULT_SETTINGS,
  marketSizing: MarketSizing = DEFAULT_MARKET_SIZING,
  tractionSeed?: TractionSeed | null
): ProjectionData[] {
  const s = normalizeScenario(scenario);
  const ns = normalizeSettings(settings);
  const nm = normalizeMarketSizing(marketSizing);
  const costs = ns.costStructure ?? DEFAULT_COST_STRUCTURE;
  const projections: ProjectionData[] = [];
  const years = ns.projectionYears;

  const effectiveStartUsers = tractionSeed?.latestCustomers ?? ns.startUsers;
  const effectiveArpu = tractionSeed?.latestArpu ?? s.arpu;
  const effectiveChurn = tractionSeed?.latestChurnRate ?? s.churnRate;
  const useScurve = ns.growthModel === 'scurve';
  const carryingCapacity = ns.scurveCarryingCapacity ?? effectiveStartUsers * 100;

  years.forEach((year, i) => {
    let users: number;
    if (useScurve) {
      users = computeScurveUsers(effectiveStartUsers, s.userGrowth, i, carryingCapacity);
    } else {
      users = Math.round(
        Math.max(0, effectiveStartUsers * Math.pow(1 + s.userGrowth, i + 1))
      );
    }

    const mau = Math.round(Math.max(0, users * (1 - effectiveChurn)));
    const prevUsers = i === 0
      ? effectiveStartUsers
      : (useScurve
        ? computeScurveUsers(effectiveStartUsers, s.userGrowth, i - 1, carryingCapacity)
        : Math.round(effectiveStartUsers * Math.pow(1 + s.userGrowth, i)));
    const newUsers = Math.max(0, users - prevUsers);

    const subscriptionRevenue = Math.round(mau * effectiveArpu * 12);
    const expansionRevenue = Math.round(subscriptionRevenue * s.expansionRate);
    const totalRevenue = subscriptionRevenue + expansionRevenue;

    const hostingCosts = Math.round(users * costs.hostingCostPerUser * 12);
    const paymentProcessing = Math.round(totalRevenue * costs.paymentProcessingRate);
    const customerSupport = Math.round(users * costs.supportCostPerUser * 12);
    const cogs = hostingCosts + paymentProcessing + customerSupport;
    const grossProfit = totalRevenue - cogs;
    const grossMargin = Number(toPercent(grossProfit, totalRevenue).toFixed(1));

    const personnel = ns.personnelByYear[i] || 0;
    const employees = ns.employeesByYear[i] || 0;
    const marketing = Math.round(newUsers * s.cac);
    const rd = costs.rdByYear[i] ?? costs.rdByYear[costs.rdByYear.length - 1] ?? 0;
    const gna = costs.gnaByYear[i] ?? costs.gnaByYear[costs.gnaByYear.length - 1] ?? 0;
    const opex = personnel + marketing + rd + gna;

    const ebitda = grossProfit - opex;
    const ebitdaMargin = Number(toPercent(ebitda, totalRevenue).toFixed(1));

    const capex = ns.capexByYear[i] || 0;
    const depreciation = ns.depreciationByYear[i] || 0;

    const ebit = ebitda - depreciation;
    const taxableIncome = Math.max(0, ebit);
    const taxes = Math.round(taxableIncome * ns.taxRate);
    const netIncome = ebit - taxes;

    const accountsReceivable = Math.round((totalRevenue / 365) * 30);
    const accountsPayable = Math.round((cogs / 365) * 45);
    const workingCapital = accountsReceivable - accountsPayable;

    const prevWorkingCapital =
      i === 0 ? 0 : projections[i - 1]?.workingCapital || 0;
    const operatingCF =
      netIncome + depreciation - (workingCapital - prevWorkingCapital);
    const investingCF = -capex;
    const freeCashFlow = operatingCF + investingCF;

    const grossMarginFraction = grossMargin / 100;
    const ltv = effectiveChurn > 0
      ? Math.round((effectiveArpu * grossMarginFraction) / effectiveChurn)
      : 0;
    const ltvCac = Number(toRatio(ltv, s.cac).toFixed(1));
    const paybackMonths =
      effectiveArpu > 0 && grossMarginFraction > 0
        ? Math.round(s.cac / (effectiveArpu * grossMarginFraction))
        : 0;
    const revenuePerEmployee =
      employees > 0 ? Math.round(totalRevenue / employees) : 0;
    const marketShare = Number(
      toPercent(Math.max(totalRevenue, 0), nm.sam).toFixed(2)
    );

    projections.push({
      year,
      users,
      mau,
      newUsers,
      subscriptionRevenue,
      expansionRevenue,
      totalRevenue,
      hostingCosts,
      paymentProcessing,
      customerSupport,
      cogs,
      grossProfit,
      grossMargin,
      personnel,
      employees,
      marketing,
      rd,
      gna,
      opex,
      ebitda,
      ebitdaMargin,
      capex,
      depreciation,
      ebit,
      taxes,
      netIncome,
      accountsReceivable,
      accountsPayable,
      workingCapital,
      operatingCF,
      investingCF,
      freeCashFlow,
      ltv,
      ltvCac,
      paybackMonths,
      revenuePerEmployee,
      marketShare,
    });
  });

  return projections;
}

export function calculateDCF(
  projections: ProjectionData[],
  discountRate: number,
  terminalGrowth: number
) {
  const normalizedDiscountRate = normalizeRate(discountRate, {
    min: 0.01,
    max: 0.95,
  });
  const normalizedTerminalGrowthRaw = normalizeRate(terminalGrowth, {
    min: -0.2,
    max: 0.2,
  });
  const normalizedTerminalGrowth =
    normalizedTerminalGrowthRaw >= normalizedDiscountRate
      ? Math.max(-0.2, Number((normalizedDiscountRate - 0.01).toFixed(4)))
      : normalizedTerminalGrowthRaw;

  const terminalYear = projections[projections.length - 1];
  const terminalValue =
    (terminalYear.freeCashFlow * (1 + normalizedTerminalGrowth)) /
    (normalizedDiscountRate - normalizedTerminalGrowth);

  const pvCashFlows = projections.map(
    (p, i) => p.freeCashFlow / Math.pow(1 + normalizedDiscountRate, i + 1)
  );
  const pvTerminal =
    terminalValue / Math.pow(1 + normalizedDiscountRate, projections.length);
  const enterpriseValue = pvCashFlows.reduce((a, b) => a + b, 0) + pvTerminal;

  return {
    discountRate: normalizedDiscountRate,
    terminalGrowth: normalizedTerminalGrowth,
    terminalValue,
    pvCashFlows,
    pvTerminal,
    enterpriseValue,
  };
}

export type VCValuationResult = {
  expectedExitValue: number;
  targetReturn: number;
  impliedPreMoney: number;
  impliedPostMoney: number;
  dilutionPercent: number;
};

export function calculateVCValuation(
  projections: ProjectionData[],
  options: {
    exitMultiple?: number;
    targetReturn?: number;
    roundSize?: number;
    yearsToExit?: number;
  } = {}
): VCValuationResult {
  const exitMultiple = options.exitMultiple ?? 10;
  const targetReturn = options.targetReturn ?? 10;
  const roundSize = options.roundSize ?? 0;
  const yearsToExit = options.yearsToExit ?? Math.max(projections.length, 1);

  const lastProjection = projections[projections.length - 1];
  const exitRevenue = lastProjection?.totalRevenue ?? 0;
  const expectedExitValue = exitRevenue * exitMultiple;

  const impliedPostMoney = targetReturn > 0
    ? expectedExitValue / Math.pow(targetReturn, 1)
    : expectedExitValue / Math.pow(10, 1 / yearsToExit);

  const impliedPreMoney = Math.max(0, impliedPostMoney - roundSize);
  const dilutionPercent = impliedPostMoney > 0
    ? (roundSize / impliedPostMoney) * 100
    : 0;

  return {
    expectedExitValue,
    targetReturn,
    impliedPreMoney,
    impliedPostMoney,
    dilutionPercent,
  };
}

export function calculateFundingNeed(
  projections: ProjectionData[],
  safetyBuffer: number
): number {
  const cumulativeCash = projections.reduce(
    (acc, p, i) => {
      const prev = i === 0 ? 0 : acc[i - 1];
      acc.push(prev + p.freeCashFlow);
      return acc;
    },
    [] as number[]
  );

  const maxNegative = Math.min(...cumulativeCash, 0);
  return Math.abs(maxNegative) + safetyBuffer;
}

export function getCumulativeCash(projections: ProjectionData[]): number[] {
  return projections.reduce(
    (acc, p, i) => {
      const prev = i === 0 ? 0 : acc[i - 1];
      acc.push(prev + p.freeCashFlow);
      return acc;
    },
    [] as number[]
  );
}

export function calculateRevenueCAGR(projections: ProjectionData[]): number {
  if (projections.length < 2) return 0;
  const first = projections[0].totalRevenue;
  const last = projections[projections.length - 1].totalRevenue;
  if (first <= 0 || last <= 0) return 0;
  const n = projections.length - 1;
  return Math.pow(last / first, 1 / n) - 1;
}

export type CapTableEntry = {
  name: string;
  sharesOrPercent: number;
  ownership: number;
  value: number;
};

export function calculateCapTable(
  preMoneyValuation: number,
  roundSize: number,
  existingShares: { name: string; percent: number }[]
): { postMoney: number; dilution: number; entries: CapTableEntry[] } {
  const postMoney = preMoneyValuation + roundSize;
  const investorOwnership = postMoney > 0 ? roundSize / postMoney : 0;
  const founderDilution = investorOwnership;

  const entries: CapTableEntry[] = existingShares.map((s) => ({
    name: s.name,
    sharesOrPercent: s.percent * (1 - founderDilution),
    ownership: s.percent * (1 - founderDilution),
    value: postMoney * s.percent * (1 - founderDilution),
  }));

  entries.push({
    name: 'New Investor',
    sharesOrPercent: investorOwnership,
    ownership: investorOwnership,
    value: roundSize,
  });

  return { postMoney, dilution: founderDilution, entries };
}
