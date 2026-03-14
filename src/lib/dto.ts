export type BusinessModelType = 'saas_subscription' | 'marketplace' | 'usage_based' | 'ecommerce' | 'other'
export type StartupStageDto = 'idea' | 'early_growth' | 'scale'

export type CreateModelDto = {
  name: string
  companyName?: string
  description?: string
  currency?: string
  businessModelType?: BusinessModelType
  stage?: StartupStageDto
  foundedAt?: string // YYYY-MM-DD
  industry?: string
  /** Optional quick snapshot: creates first monthly metric row */
  quickSnapshot?: {
    mrr?: number
    customers?: number
    monthlyBurn?: number
    cashBalance?: number
  }
}

export type UpdateModelDto = {
  name?: string
  companyName?: string
  description?: string
  currency?: string
  businessModelType?: BusinessModelType
  stage?: StartupStageDto
  foundedAt?: string | null
  industry?: string | null
  lastRoundSize?: number | null
  lastRoundValuation?: number | null
}

export type UpdateScenarioDto = {
  userGrowth: number
  arpu: number
  churnRate: number
  cac: number
  expansionRate?: number
  grossMarginTarget?: number
  revenueGrowthRate?: number
  /** @deprecated kept for backward compat during migration */
  farmerGrowth?: number
  takeRate?: number
  gmvGrowth?: number
}

export type ScenarioType = 'conservative' | 'base' | 'optimistic'

export type MarketSizingDto = {
  tam: number
  tamDescription?: string
  sam: number
  samDescription?: string
  som: number[]
  somDescription?: string
}

export type UpdateSettingsDto = {
  startUsers?: number
  taxRate?: number
  discountRate?: number
  terminalGrowth?: number
  safetyBuffer?: number
  personnelByYear?: number[]
  employeesByYear?: number[]
  capexByYear?: number[]
  depreciationByYear?: number[]
  projectionYears?: number[]
  monthlyBurnRate?: number | null
  currentCash?: number | null
  revenueMultiple?: number | null
  arrMultiple?: number | null
  costStructure?: {
    hostingCostPerUser: number
    paymentProcessingRate: number
    supportCostPerUser: number
    rdByYear: number[]
    gnaByYear: number[]
  } | null
  growthModel?: 'linear' | 'scurve'
  scurveCarryingCapacity?: number | null
  /** @deprecated kept for backward compat */
  startFarmers?: number
}

export type UpdateMetricsDto = {
  usersTotal?: number | null
  dau?: number | null
  mau?: number | null
  growthRate?: number | null
  activationRate?: number | null
  retentionRate?: number | null
  churnRate?: number | null
  mrr?: number | null
  arr?: number | null
  arpu?: number | null
  revenueGrowthRate?: number | null
  expansionRevenue?: number | null
  contractionRevenue?: number | null
  cac?: number | null
  ltv?: number | null
  ltvCac?: number | null
  paybackPeriodMonths?: number | null
  conversionRate?: number | null
  cpl?: number | null
  salesCycleLengthDays?: number | null
  winRate?: number | null
  dauMauRatio?: number | null
  featureAdoptionRate?: number | null
  timeToValueDays?: number | null
  nps?: number | null
  burnRate?: number | null
  runwayMonths?: number | null
  grossMargin?: number | null
  operatingMargin?: number | null
}

/** Single row of monthly traction data */
export type MonthlyMetricDto = {
  id?: number
  modelId: number
  month: string // YYYY-MM-DD first of month
  mrr?: number | null
  newMrr?: number | null
  expansionMrr?: number | null
  contractionMrr?: number | null
  churnedMrr?: number | null
  customers?: number | null
  newCustomers?: number | null
  churnedCustomers?: number | null
  gmv?: number | null
  revenue?: number | null
  grossProfit?: number | null
  opex?: number | null
  cashBalance?: number | null
  headcount?: number | null
  marketingSpend?: number | null
}

export type UpsertMonthlyMetricsDto = {
  modelId: number
  rows: Omit<MonthlyMetricDto, 'modelId' | 'id'>[]
}

/** Single cohort row */
export type CohortDto = {
  id?: number
  modelId: number
  cohortMonth: string // YYYY-MM-DD
  cohortSize: number
  retentionByMonth: number[]
  revenueByMonth?: number[] | null
}

export type UpsertCohortsDto = {
  modelId: number
  cohorts: Omit<CohortDto, 'modelId' | 'id'>[]
}

/** Fundraising round (one per model) */
export type FundraisingDto = {
  id?: number
  modelId: number
  targetRaise?: number | null
  preMoneyValuation?: number | null
  useOfFunds?: Record<string, number> | null // e.g. { engineering: 40, sales: 30, marketing: 20, ops: 10 }
  runwayTarget?: number | null
  plannedClose?: string | null // YYYY-MM-DD
}

export type UpdateFundraisingDto = {
  targetRaise?: number | null
  preMoneyValuation?: number | null
  useOfFunds?: Record<string, number> | null
  runwayTarget?: number | null
  plannedClose?: string | null
}

export type AIProvider = 'openai' | 'gemini'

export type PresentationStatus = "draft" | "generating" | "ready" | "failed"
/** @deprecated Use PresentationStatus */
export type PitchDeckStatus = PresentationStatus

export type PitchDeckBriefDto = {
  problem: string
  solution: string
  product: string
  market: string
  businessModel: string
  traction: string
  goToMarket: string
  competition: string
  financialHighlights: string
  fundingAsk: string
}

export type PitchDeckSlideTypeDto =
  | 'cover'
  | 'problem'
  | 'solution'
  | 'market'
  | 'product'
  | 'traction'
  | 'business-model'
  | 'go-to-market'
  | 'financials'
  | 'ask'

export type SlideLayoutId =
  | 'default'
  | 'image-left'
  | 'image-right'
  | 'image-top'
  | 'image-full'

export type PitchDeckSlideDto = {
  id: string
  type: PitchDeckSlideTypeDto
  heading: string
  subheading: string
  bullets: string[]
  speakerNotes: string
  /** 1–4 short key metrics or callouts (e.g. "$2M ARR", "40% MoM") for presentation-style slides */
  keyMetrics?: string[]
  /** 0-based index of the bullet to emphasise visually */
  emphasisBulletIndex?: number
  /** Image URL for the slide (optional) */
  imageUrl?: string
  /** Layout of the slide when image is present */
  layout?: SlideLayoutId
  /** Image scale factor from corner-handle resize (0.25–3, default 1) */
  imageScale?: number
  /** Horizontal pan when image overflows (0=left, 0.5=center, 1=right) */
  imagePanX?: number
  /** Vertical pan when image overflows (0=top, 0.5=center, 1=bottom) */
  imagePanY?: number
}

export type PitchDeckTemplateId =
  | 'minimal'
  | 'professional-blue'
  | 'bold-dark'
  | 'warm-earthy'
  | 'tech-modern'

/** Design mode: manual template picker vs AI-designed style */
export type PitchDeckDesignMode = 'manual_template' | 'ai_designed'

/** A single theme photo — either user-uploaded (base64 data URL) or from Unsplash */
export type PitchDeckThemePhoto = {
  /** Base64 data URL (user upload) or remote HTTPS URL (Unsplash) */
  url: string
  /** Alt / description text */
  alt?: string
  /** Unsplash photo ID if sourced from Unsplash */
  unsplashId?: string
  /** Unsplash photographer name for attribution */
  photographerName?: string
}

/** User questionnaire answers for Full AI slides style */
export type PitchDeckStyleQuestionnaireInput = {
  colorDirection?: string
  imageryStyle?: string
  visualDensity?: string
  typographyPersonality?: string
  brandAlignment?: string
  investorRiskProfile?: string
  optionalNote?: string
  /** Theme photos that define the visual mood/style of the presentation (max 5) */
  themePhotos?: PitchDeckThemePhoto[]
}

/** Global theme tokens from Gemini Full AI */
export type PitchDeckAiStyleGlobal = {
  palette?: { background?: string; heading?: string; subheading?: string; bullets?: string; accent?: string; footer?: string; border?: string }
  typographyPersonality?: string
  visualDensity?: string
  motif?: string
  brandAlignment?: string
  investorEmphasis?: string
}

/** Per-slide hint from Gemini (layout emphasis, visual motif) */
export type PitchDeckAiStyleSlideHint = {
  layoutEmphasis?: string
  visualMotif?: string
}

/** Persisted AI style instructions: global + per-slide hints */
export type PitchDeckAiStyleInstructions = {
  global?: PitchDeckAiStyleGlobal
  slideHints?: Partial<Record<PitchDeckSlideTypeDto, PitchDeckAiStyleSlideHint>>
}

export type CreatePitchDeckDto = {
  title: string
  startupName: string
  oneLiner?: string
  audience?: string
  language?: string
  currency?: string
  provider: AIProvider
  providerModel?: string
  modelId?: number
  template?: PitchDeckTemplateId
  brief: PitchDeckBriefDto
}

export type UpdatePitchDeckSlidesDto = {
  slides: PitchDeckSlideDto[]
}

export type ModelResponseDto = {
  id: number
  userId: string
  name: string
  companyName: string | null
  description: string | null
  currency: string
  businessModelType: BusinessModelType | null
  stage: StartupStageDto | null
  foundedAt: string | null
  industry: string | null
  lastRoundSize: string | null
  lastRoundValuation: string | null
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
  cac: string
  expansionRate?: string
  grossMarginTarget?: string
  revenueGrowthRate?: string
  /** @deprecated kept for backward compat */
  farmerGrowth?: string
  createdAt: Date
  updatedAt: Date
}

export type ProjectionResponseDto = {
  id: number
  modelId: number
  scenarioType: ScenarioType
  year: number
  users: number
  mau: number
  newUsers: number
  subscriptionRevenue: number
  expansionRevenue: number
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
