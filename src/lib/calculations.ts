export type ScenarioParams = {
  userGrowth: number;
  arpu: number;
  churnRate: number;
  farmerGrowth: number;
  cac: number;
};

export type ModelSettings = {
  startUsers: number;
  startFarmers: number;
  taxRate: number;
  discountRate: number;
  terminalGrowth: number;
  safetyBuffer: number;
  personnelByYear: number[];
  employeesByYear: number[];
  capexByYear: number[];
  depreciationByYear: number[];
  projectionYears: number[];
};

export type ProjectionData = {
  year: number;
  users: number;
  farmers: number;
  mau: number;
  newUsers: number;
  platformRevenue: number;
  farmerRevShare: number;
  b2bRevenue: number;
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
  sam: number;
  som: number[];
};

export const DEFAULT_SETTINGS: ModelSettings = {
  startUsers: 1000,
  startFarmers: 50,
  taxRate: 0.12,
  discountRate: 0.30,
  terminalGrowth: 0.03,
  safetyBuffer: 50000,
  personnelByYear: [36000, 72000, 144000, 216000, 288000],
  employeesByYear: [2, 4, 8, 12, 16],
  capexByYear: [15000, 10000, 20000, 15000, 10000],
  depreciationByYear: [3750, 6250, 11250, 15000, 13750],
  projectionYears: [2025, 2026, 2027, 2028, 2029],
};

export const DEFAULT_MARKET_SIZING: MarketSizing = {
  tam: 850000000,
  sam: 42000000,
  som: [210000, 840000, 2520000, 6300000, 12600000],
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
  farmerGrowth: normalizeRate(scenario.farmerGrowth, { min: -0.95, max: 3 }),
  cac: Math.max(0, toFiniteNumber(scenario.cac, 0)),
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
    startFarmers: Math.max(0, Math.round(toFiniteNumber(settings.startFarmers, 0))),
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
  tam: Math.max(0, Math.round(toFiniteNumber(marketSizing.tam, 0))),
  sam: Math.max(1, Math.round(toFiniteNumber(marketSizing.sam, 1))),
  som: marketSizing.som.map((v) => Math.max(0, Math.round(toFiniteNumber(v, 0)))),
});

export function calculateProjections(
  scenario: ScenarioParams,
  settings: ModelSettings = DEFAULT_SETTINGS,
  marketSizing: MarketSizing = DEFAULT_MARKET_SIZING
): ProjectionData[] {
  const normalizedScenario = normalizeScenario(scenario);
  const normalizedSettings = normalizeSettings(settings);
  const normalizedMarketSizing = normalizeMarketSizing(marketSizing);
  const projections: ProjectionData[] = [];
  const years = normalizedSettings.projectionYears;

  years.forEach((year, i) => {
    const users = Math.round(
      Math.max(
        0,
        normalizedSettings.startUsers *
          Math.pow(1 + normalizedScenario.userGrowth, i + 1)
      )
    );
    const farmers = Math.round(
      Math.max(
        0,
        normalizedSettings.startFarmers *
          Math.pow(1 + normalizedScenario.farmerGrowth, i + 1)
      )
    );
    const mau = Math.round(Math.max(0, users * (1 - normalizedScenario.churnRate)));
    const newUsers =
      i === 0
        ? users
        : Math.max(
            0,
            Math.round(
              users -
                normalizedSettings.startUsers *
                  Math.pow(1 + normalizedScenario.userGrowth, i)
            )
          );

    // Revenue streams
    const platformRevenue = Math.round(mau * normalizedScenario.arpu * 12);
    const farmerRevShare = Math.round(farmers * 500 * 12 * 0.15);
    const b2bRevenue = Math.round((platformRevenue + farmerRevShare) * 0.1);
    const totalRevenue = platformRevenue + farmerRevShare + b2bRevenue;

    // COGS
    const hostingCosts = Math.round(users * 0.5 * 12);
    const paymentProcessing = Math.round(totalRevenue * 0.03);
    const customerSupport = Math.round(users * 0.2 * 12);
    const cogs = hostingCosts + paymentProcessing + customerSupport;
    const grossProfit = totalRevenue - cogs;
    const grossMargin = Number(toPercent(grossProfit, totalRevenue).toFixed(1));

    // Operating Expenses
    const personnel = normalizedSettings.personnelByYear[i] || 0;
    const employees = normalizedSettings.employeesByYear[i] || 0;
    const marketing = Math.round(newUsers * normalizedScenario.cac);
    const rd = Math.round(25000 + i * 15000);
    const gna = Math.round(12000 + i * 6000);
    const opex = personnel + marketing + rd + gna;

    // EBITDA
    const ebitda = grossProfit - opex;
    const ebitdaMargin = Number(toPercent(ebitda, totalRevenue).toFixed(1));

    // Depreciation
    const capex = normalizedSettings.capexByYear[i] || 0;
    const depreciation = normalizedSettings.depreciationByYear[i] || 0;

    // EBIT & Taxes
    const ebit = ebitda - depreciation;
    const taxableIncome = Math.max(0, ebit);
    const taxes = Math.round(taxableIncome * normalizedSettings.taxRate);
    const netIncome = ebit - taxes;

    // Working Capital
    const accountsReceivable = Math.round((totalRevenue / 365) * 30); // 30 days
    const accountsPayable = Math.round((cogs / 365) * 45); // 45 days
    const workingCapital = accountsReceivable - accountsPayable;

    // Cash Flow
    const prevWorkingCapital =
      i === 0 ? 0 : projections[i - 1]?.workingCapital || 0;
    const operatingCF =
      netIncome + depreciation - (workingCapital - prevWorkingCapital);
    const investingCF = -capex;
    const freeCashFlow = operatingCF + investingCF;

    // KPIs
    const ltv = Math.round(
      normalizedScenario.arpu * 12 * (1 / normalizedScenario.churnRate)
    );
    const ltvCac = Number(toRatio(ltv, normalizedScenario.cac).toFixed(1));
    const paybackMonths =
      normalizedScenario.arpu > 0
        ? Math.round(normalizedScenario.cac / normalizedScenario.arpu)
        : 0;
    const revenuePerEmployee =
      employees > 0 ? Math.round(totalRevenue / employees) : 0;
    const marketShare = Number(
      toPercent(Math.max(totalRevenue, 0), normalizedMarketSizing.sam).toFixed(2)
    );

    projections.push({
      year,
      users,
      farmers,
      mau,
      newUsers,
      platformRevenue,
      farmerRevShare,
      b2bRevenue,
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
