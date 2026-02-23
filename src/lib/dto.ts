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

export type UpdateMetricsDto = {
  usersTotal?: number
  dau?: number
  mau?: number
  growthRate?: number
  activationRate?: number
  retentionRate?: number
  churnRate?: number
  mrr?: number
  arr?: number
  arpu?: number
  revenueGrowthRate?: number
  expansionRevenue?: number
  contractionRevenue?: number
  cac?: number
  ltv?: number
  ltvCac?: number
  paybackPeriodMonths?: number
  conversionRate?: number
  cpl?: number
  salesCycleLengthDays?: number
  winRate?: number
  dauMauRatio?: number
  featureAdoptionRate?: number
  timeToValueDays?: number
  nps?: number
  burnRate?: number
  runwayMonths?: number
  grossMargin?: number
  operatingMargin?: number
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

/** User questionnaire answers for Full AI slides style */
export type PitchDeckStyleQuestionnaireInput = {
  colorDirection?: string
  imageryStyle?: string
  visualDensity?: string
  typographyPersonality?: string
  brandAlignment?: string
  investorRiskProfile?: string
  optionalNote?: string
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
