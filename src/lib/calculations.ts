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

export function calculateProjections(
  scenario: ScenarioParams,
  settings: ModelSettings = DEFAULT_SETTINGS,
  marketSizing: MarketSizing = DEFAULT_MARKET_SIZING
): ProjectionData[] {
  const projections: ProjectionData[] = [];
  const years = settings.projectionYears;

  years.forEach((year, i) => {
    const users = Math.round(
      settings.startUsers * Math.pow(1 + scenario.userGrowth, i + 1)
    );
    const farmers = Math.round(
      settings.startFarmers * Math.pow(1 + scenario.farmerGrowth, i + 1)
    );
    const mau = Math.round(users * (1 - scenario.churnRate));
    const newUsers =
      i === 0
        ? users
        : Math.round(
            users - settings.startUsers * Math.pow(1 + scenario.userGrowth, i)
          );

    // Revenue streams
    const platformRevenue = Math.round(mau * scenario.arpu * 12);
    const farmerRevShare = Math.round(farmers * 500 * 12 * 0.15);
    const b2bRevenue = Math.round((platformRevenue + farmerRevShare) * 0.1);
    const totalRevenue = platformRevenue + farmerRevShare + b2bRevenue;

    // COGS
    const hostingCosts = Math.round(users * 0.5 * 12);
    const paymentProcessing = Math.round(totalRevenue * 0.03);
    const customerSupport = Math.round(users * 0.2 * 12);
    const cogs = hostingCosts + paymentProcessing + customerSupport;
    const grossProfit = totalRevenue - cogs;
    const grossMargin = Number(((grossProfit / totalRevenue) * 100).toFixed(1));

    // Operating Expenses
    const personnel = settings.personnelByYear[i] || 0;
    const employees = settings.employeesByYear[i] || 0;
    const marketing = Math.round(newUsers * scenario.cac);
    const rd = Math.round(25000 + i * 15000);
    const gna = Math.round(12000 + i * 6000);
    const opex = personnel + marketing + rd + gna;

    // EBITDA
    const ebitda = grossProfit - opex;
    const ebitdaMargin = Number(((ebitda / totalRevenue) * 100).toFixed(1));

    // Depreciation
    const capex = settings.capexByYear[i] || 0;
    const depreciation = settings.depreciationByYear[i] || 0;

    // EBIT & Taxes
    const ebit = ebitda - depreciation;
    const taxableIncome = Math.max(0, ebit);
    const taxes = Math.round(taxableIncome * settings.taxRate);
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
    const ltv = Math.round(scenario.arpu * 12 * (1 / scenario.churnRate));
    const ltvCac = Number((ltv / scenario.cac).toFixed(1));
    const paybackMonths = Math.round(scenario.cac / scenario.arpu);
    const revenuePerEmployee = Math.round(totalRevenue / employees);
    const marketShare = Number(
      ((totalRevenue / marketSizing.sam) * 100).toFixed(2)
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
  const terminalYear = projections[projections.length - 1];
  const terminalValue =
    (terminalYear.freeCashFlow * (1 + terminalGrowth)) /
    (discountRate - terminalGrowth);

  const pvCashFlows = projections.map(
    (p, i) => p.freeCashFlow / Math.pow(1 + discountRate, i + 1)
  );
  const pvTerminal =
    terminalValue / Math.pow(1 + discountRate, projections.length);
  const enterpriseValue = pvCashFlows.reduce((a, b) => a + b, 0) + pvTerminal;

  return {
    discountRate,
    terminalGrowth,
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
