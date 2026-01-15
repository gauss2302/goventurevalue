export type CreateModelDto = {
  name: string
  companyName?: string
  description?: string
  currency?: string
}

export type UpdateModelDto = {
  name?: string
  companyName?: string
  description?: string
  currency?: string
}

export type UpdateScenarioDto = {
  userGrowth: number
  arpu: number
  churnRate: number
  farmerGrowth: number
  cac: number
}

export type ScenarioType = 'conservative' | 'base' | 'optimistic'

export type MarketSizingDto = {
  tam: number
  sam: number
  som: number[]
}

export type UpdateSettingsDto = {
  startUsers?: number
  startFarmers?: number
  taxRate?: number
  discountRate?: number
  terminalGrowth?: number
  safetyBuffer?: number
  personnelByYear?: number[]
  employeesByYear?: number[]
  capexByYear?: number[]
  depreciationByYear?: number[]
  projectionYears?: number[]
}

export type ModelResponseDto = {
  id: number
  userId: string
  name: string
  companyName: string | null
  description: string | null
  currency: string
  createdAt: Date
  updatedAt: Date
}

export type ScenarioResponseDto = {
  id: number
  modelId: number
  scenarioType: ScenarioType
  userGrowth: string
  arpu: string
  churnRate: string
  farmerGrowth: string
  cac: string
  createdAt: Date
  updatedAt: Date
}

export type ProjectionResponseDto = {
  id: number
  modelId: number
  scenarioType: ScenarioType
  year: number
  users: number
  farmers: number
  mau: number
  newUsers: number
  platformRevenue: number
  farmerRevShare: number
  b2bRevenue: number
  totalRevenue: number
  hostingCosts: number
  paymentProcessing: number
  customerSupport: number
  cogs: number
  grossProfit: number
  grossMargin: string
  personnel: number
  employees: number
  marketing: number
  rd: number
  gna: number
  opex: number
  ebitda: number
  ebitdaMargin: string
  capex: number
  depreciation: number
  ebit: number
  taxes: number
  netIncome: number
  accountsReceivable: number
  accountsPayable: number
  workingCapital: number
  operatingCF: number
  investingCF: number
  freeCashFlow: number
  ltv: number
  ltvCac: string
  paybackMonths: number
  revenuePerEmployee: number
  marketShare: string
  createdAt: Date
}
