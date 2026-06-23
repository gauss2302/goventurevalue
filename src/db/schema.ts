import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export type ScenarioType = "conservative" | "base" | "optimistic";
export type StartupStage = "idea" | "early_growth" | "scale";
export type BusinessModelType =
  | "saas_subscription"
  | "marketplace"
  | "usage_based"
  | "ecommerce"
  | "other";
export type AiProvider = "openai" | "gemini";
export type PitchDeckStatus = "draft" | "generating" | "ready" | "failed";
export type PitchDeckDesignMode = "manual_template" | "ai_designed";

// Better Auth Schema - Required for authentication
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .defaultNow()
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const todos = sqliteTable("todos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});

export const billingSubscriptions = sqliteTable(
  "billing_subscriptions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .unique(),
    polarCustomerId: text("polar_customer_id"),
    polarSubscriptionId: text("polar_subscription_id"),
    productId: text("product_id"),
    status: text("status").default("inactive").notNull(),
    currentPeriodEnd: integer("current_period_end", { mode: "timestamp" }),
    cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" })
      .default(false)
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("billing_subscriptions_user_idx").on(table.userId),
    index("billing_subscriptions_status_idx").on(table.status),
  ],
);

export const financialModels = sqliteTable("financial_models", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  companyName: text("company_name"),
  description: text("description"),
  currency: text("currency").default("USD").notNull(),
  businessModelType: text("business_model_type").$type<BusinessModelType>(),
  stage: text("stage").$type<StartupStage>(),
  foundedAt: text("founded_at"),
  industry: text("industry"),
  lastRoundSize: text("last_round_size"),
  lastRoundValuation: text("last_round_valuation"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .defaultNow()
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .defaultNow()
    .notNull(),
});

export const modelScenarios = sqliteTable("model_scenarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  modelId: integer("model_id")
    .references(() => financialModels.id, { onDelete: "cascade" })
    .notNull(),
  scenarioType: text("scenario_type").$type<ScenarioType>().notNull(),
  userGrowth: text("user_growth").notNull(),
  arpu: text("arpu").notNull(),
  churnRate: text("churn_rate").notNull(),
  farmerGrowth: text("farmer_growth").notNull(),
  cac: text("cac").notNull(),
  revenueGrowthRate: text("revenue_growth_rate"),
  grossMarginTarget: text("gross_margin_target"),
  expansionRate: text("expansion_rate"),
  takeRate: text("take_rate"),
  gmvGrowth: text("gmv_growth"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .defaultNow()
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .defaultNow()
    .notNull(),
});

export const modelProjections = sqliteTable("model_projections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  modelId: integer("model_id")
    .references(() => financialModels.id, { onDelete: "cascade" })
    .notNull(),
  scenarioType: text("scenario_type").$type<ScenarioType>().notNull(),
  year: integer("year").notNull(),
  users: integer("users").notNull(),
  farmers: integer("farmers").notNull(),
  mau: integer("mau").notNull(),
  newUsers: integer("new_users").notNull(),
  platformRevenue: integer("platform_revenue").notNull(),
  farmerRevShare: integer("farmer_rev_share").notNull(),
  b2bRevenue: integer("b2b_revenue").notNull(),
  totalRevenue: integer("total_revenue").notNull(),
  hostingCosts: integer("hosting_costs").notNull(),
  paymentProcessing: integer("payment_processing").notNull(),
  customerSupport: integer("customer_support").notNull(),
  cogs: integer("cogs").notNull(),
  grossProfit: integer("gross_profit").notNull(),
  grossMargin: text("gross_margin").notNull(),
  personnel: integer("personnel").notNull(),
  employees: integer("employees").notNull(),
  marketing: integer("marketing").notNull(),
  rd: integer("rd").notNull(),
  gna: integer("gna").notNull(),
  opex: integer("opex").notNull(),
  ebitda: integer("ebitda").notNull(),
  ebitdaMargin: text("ebitda_margin").notNull(),
  capex: integer("capex").notNull(),
  depreciation: integer("depreciation").notNull(),
  ebit: integer("ebit").notNull(),
  taxes: integer("taxes").notNull(),
  netIncome: integer("net_income").notNull(),
  accountsReceivable: integer("accounts_receivable").notNull(),
  accountsPayable: integer("accounts_payable").notNull(),
  workingCapital: integer("working_capital").notNull(),
  operatingCF: integer("operating_cf").notNull(),
  investingCF: integer("investing_cf").notNull(),
  freeCashFlow: integer("free_cash_flow").notNull(),
  ltv: integer("ltv").notNull(),
  ltvCac: text("ltv_cac").notNull(),
  paybackMonths: integer("payback_months").notNull(),
  revenuePerEmployee: integer("revenue_per_employee").notNull(),
  marketShare: text("market_share").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .defaultNow()
    .notNull(),
});

export const marketSizing = sqliteTable("market_sizing", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  modelId: integer("model_id")
    .references(() => financialModels.id, { onDelete: "cascade" })
    .notNull(),
  tam: integer("tam").notNull(),
  tamDescription: text("tam_description").default(""),
  sam: integer("sam").notNull(),
  samDescription: text("sam_description").default(""),
  som: text("som", { mode: "json" }).$type<number[]>().notNull(),
  somDescription: text("som_description").default(""),
  createdAt: integer("created_at", { mode: "timestamp" })
    .defaultNow()
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .defaultNow()
    .notNull(),
});

export const modelSettings = sqliteTable("model_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  modelId: integer("model_id")
    .references(() => financialModels.id, { onDelete: "cascade" })
    .notNull(),
  startUsers: integer("start_users").default(1000).notNull(),
  startFarmers: integer("start_farmers").default(50).notNull(),
  taxRate: text("tax_rate").default("0.12").notNull(),
  discountRate: text("discount_rate").default("0.30").notNull(),
  terminalGrowth: text("terminal_growth").default("0.03").notNull(),
  safetyBuffer: integer("safety_buffer").default(50000).notNull(),
  personnelByYear: text("personnel_by_year", { mode: "json" })
    .$type<number[]>()
    .default([36000, 72000, 144000, 216000, 288000])
    .notNull(),
  employeesByYear: text("employees_by_year", { mode: "json" })
    .$type<number[]>()
    .default([2, 4, 8, 12, 16])
    .notNull(),
  capexByYear: text("capex_by_year", { mode: "json" })
    .$type<number[]>()
    .default([15000, 10000, 20000, 15000, 10000])
    .notNull(),
  depreciationByYear: text("depreciation_by_year", { mode: "json" })
    .$type<number[]>()
    .default([3750, 6250, 11250, 15000, 13750])
    .notNull(),
  projectionYears: text("projection_years", { mode: "json" })
    .$type<number[]>()
    .default([2025, 2026, 2027, 2028, 2029])
    .notNull(),
  monthlyBurnRate: text("monthly_burn_rate"),
  currentCash: text("current_cash"),
  revenueMultiple: text("revenue_multiple"),
  arrMultiple: text("arr_multiple"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .defaultNow()
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .defaultNow()
    .notNull(),
});

export const modelMetrics = sqliteTable("model_metrics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  modelId: integer("model_id")
    .references(() => financialModels.id, { onDelete: "cascade" })
    .notNull(),
  usersTotal: text("users_total"),
  dau: text("dau"),
  mau: text("mau"),
  growthRate: text("growth_rate"),
  activationRate: text("activation_rate"),
  retentionRate: text("retention_rate"),
  churnRate: text("churn_rate"),
  mrr: text("mrr"),
  arr: text("arr"),
  arpu: text("arpu"),
  revenueGrowthRate: text("revenue_growth_rate"),
  expansionRevenue: text("expansion_revenue"),
  contractionRevenue: text("contraction_revenue"),
  cac: text("cac"),
  ltv: text("ltv"),
  ltvCac: text("ltv_cac"),
  paybackPeriodMonths: text("payback_period_months"),
  conversionRate: text("conversion_rate"),
  cpl: text("cpl"),
  salesCycleLengthDays: text("sales_cycle_length_days"),
  winRate: text("win_rate"),
  dauMauRatio: text("dau_mau_ratio"),
  featureAdoptionRate: text("feature_adoption_rate"),
  timeToValueDays: text("time_to_value_days"),
  nps: text("nps"),
  burnRate: text("burn_rate"),
  runwayMonths: text("runway_months"),
  grossMargin: text("gross_margin"),
  operatingMargin: text("operating_margin"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .defaultNow()
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .defaultNow()
    .notNull(),
});

export const modelMonthlyMetrics = sqliteTable(
  "model_monthly_metrics",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    modelId: integer("model_id")
      .notNull()
      .references(() => financialModels.id, { onDelete: "cascade" }),
    month: text("month").notNull(),
    mrr: text("mrr"),
    newMrr: text("new_mrr"),
    expansionMrr: text("expansion_mrr"),
    contractionMrr: text("contraction_mrr"),
    churnedMrr: text("churned_mrr"),
    customers: integer("customers"),
    newCustomers: integer("new_customers"),
    churnedCustomers: integer("churned_customers"),
    gmv: text("gmv"),
    revenue: text("revenue"),
    grossProfit: text("gross_profit"),
    opex: text("opex"),
    cashBalance: text("cash_balance"),
    headcount: integer("headcount"),
    marketingSpend: text("marketing_spend"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("model_monthly_metrics_model_month_idx").on(
      table.modelId,
      table.month,
    ),
    index("model_monthly_metrics_model_id_idx").on(table.modelId),
  ],
);

export const modelCohorts = sqliteTable(
  "model_cohorts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    modelId: integer("model_id")
      .notNull()
      .references(() => financialModels.id, { onDelete: "cascade" }),
    cohortMonth: text("cohort_month").notNull(),
    cohortSize: integer("cohort_size").notNull(),
    retentionByMonth: text("retention_by_month", { mode: "json" }).$type<
      number[]
    >(),
    revenueByMonth: text("revenue_by_month", { mode: "json" }).$type<
      number[]
    >(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("model_cohorts_model_cohort_month_idx").on(
      table.modelId,
      table.cohortMonth,
    ),
    index("model_cohorts_model_id_idx").on(table.modelId),
  ],
);

export const modelFundraising = sqliteTable("model_fundraising", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  modelId: integer("model_id")
    .notNull()
    .references(() => financialModels.id, { onDelete: "cascade" })
    .unique(),
  targetRaise: text("target_raise"),
  preMoneyValuation: text("pre_money_valuation"),
  useOfFunds: text("use_of_funds", { mode: "json" }).$type<
    Record<string, number>
  >(),
  runwayTarget: integer("runway_target"),
  plannedClose: text("planned_close"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .defaultNow()
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .defaultNow()
    .notNull(),
});

export const pitchDecks = sqliteTable(
  "pitch_decks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    modelId: integer("model_id").references(() => financialModels.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    startupName: text("startup_name").notNull(),
    oneLiner: text("one_liner"),
    audience: text("audience").default("investors").notNull(),
    language: text("language").default("en").notNull(),
    currency: text("currency").default("USD").notNull(),
    provider: text("provider").$type<AiProvider>().notNull(),
    providerModel: text("provider_model").notNull(),
    status: text("status").$type<PitchDeckStatus>().default("draft").notNull(),
    brief: text("brief", { mode: "json" }).notNull(),
    slides: text("slides", { mode: "json" })
      .$type<unknown[]>()
      .default([])
      .notNull(),
    template: text("template").default("minimal").notNull(),
    designMode: text("design_mode")
      .$type<PitchDeckDesignMode>()
      .default("manual_template")
      .notNull(),
    aiStyleInput: text("ai_style_input", { mode: "json" }),
    aiStyleInstructions: text("ai_style_instructions", { mode: "json" }),
    generationMeta: text("generation_meta", { mode: "json" }),
    lastError: text("last_error"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("pitch_decks_user_idx").on(table.userId),
    index("pitch_decks_model_idx").on(table.modelId),
    index("pitch_decks_updated_idx").on(table.updatedAt),
  ],
);

export const metricSnapshot = sqliteTable(
  "metric_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    stage: text("stage").$type<StartupStage>().notNull(),
    metricKey: text("metric_key").notNull(),
    value: text("value").notNull(),
    periodStart: integer("period_start", { mode: "timestamp" }).notNull(),
    periodEnd: integer("period_end", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("metric_snapshots_user_period_idx").on(table.userId, table.periodEnd),
    index("metric_snapshots_stage_idx").on(table.stage),
  ],
);

export const financialModelsRelations = relations(
  financialModels,
  ({ many, one }) => ({
    scenarios: many(modelScenarios),
    projections: many(modelProjections),
    marketSizing: many(marketSizing),
    settings: one(modelSettings),
    metrics: many(modelMetrics),
    monthlyMetrics: many(modelMonthlyMetrics),
    cohorts: many(modelCohorts),
    fundraising: one(modelFundraising),
    pitchDecks: many(pitchDecks),
  }),
);

export const modelScenariosRelations = relations(modelScenarios, ({ one }) => ({
  model: one(financialModels, {
    fields: [modelScenarios.modelId],
    references: [financialModels.id],
  }),
}));

export const modelProjectionsRelations = relations(
  modelProjections,
  ({ one }) => ({
    model: one(financialModels, {
      fields: [modelProjections.modelId],
      references: [financialModels.id],
    }),
  }),
);

export const marketSizingRelations = relations(marketSizing, ({ one }) => ({
  model: one(financialModels, {
    fields: [marketSizing.modelId],
    references: [financialModels.id],
  }),
}));

export const modelSettingsRelations = relations(modelSettings, ({ one }) => ({
  model: one(financialModels, {
    fields: [modelSettings.modelId],
    references: [financialModels.id],
  }),
}));

export const modelMetricsRelations = relations(modelMetrics, ({ one }) => ({
  model: one(financialModels, {
    fields: [modelMetrics.modelId],
    references: [financialModels.id],
  }),
}));

export const modelMonthlyMetricsRelations = relations(
  modelMonthlyMetrics,
  ({ one }) => ({
    model: one(financialModels, {
      fields: [modelMonthlyMetrics.modelId],
      references: [financialModels.id],
    }),
  }),
);

export const modelCohortsRelations = relations(modelCohorts, ({ one }) => ({
  model: one(financialModels, {
    fields: [modelCohorts.modelId],
    references: [financialModels.id],
  }),
}));

export const modelFundraisingRelations = relations(
  modelFundraising,
  ({ one }) => ({
    model: one(financialModels, {
      fields: [modelFundraising.modelId],
      references: [financialModels.id],
    }),
  }),
);

export const pitchDecksRelations = relations(pitchDecks, ({ one }) => ({
  user: one(user, {
    fields: [pitchDecks.userId],
    references: [user.id],
  }),
  model: one(financialModels, {
    fields: [pitchDecks.modelId],
    references: [financialModels.id],
  }),
}));

export const billingSubscriptionsRelations = relations(
  billingSubscriptions,
  ({ one }) => ({
    user: one(user, {
      fields: [billingSubscriptions.userId],
      references: [user.id],
    }),
  }),
);
