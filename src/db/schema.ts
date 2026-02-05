import { pgTable, serial, text, timestamp, integer, decimal, boolean, pgEnum, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Better Auth Schema - Required for authentication
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_userId_idx').on(table.userId)],
)

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'), // Password hash for email/password auth (providerId='credential')
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('account_userId_idx').on(table.userId)],
)

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
)

// Better Auth Relations
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

export const todos = pgTable('todos', {
  id: serial().primaryKey(),
  title: text().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

// Financial Models Schema
export const financialModels = pgTable('financial_models', {
  id: serial().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }), // Better Auth user ID
  name: text('name').notNull(),
  companyName: text('company_name'),
  description: text('description'),
  currency: text('currency').default('USD').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const scenarioTypeEnum = pgEnum('scenario_type', ['conservative', 'base', 'optimistic'])

export const modelScenarios = pgTable('model_scenarios', {
  id: serial().primaryKey(),
  modelId: integer('model_id').references(() => financialModels.id, { onDelete: 'cascade' }).notNull(),
  scenarioType: scenarioTypeEnum('scenario_type').notNull(),
  userGrowth: decimal('user_growth', { precision: 8, scale: 4 }).notNull(), // e.g., 0.25 for 25% or 25 for 25%
  arpu: decimal('arpu', { precision: 10, scale: 2 }).notNull(), // Average Revenue Per User
  churnRate: decimal('churn_rate', { precision: 8, scale: 4 }).notNull(),
  farmerGrowth: decimal('farmer_growth', { precision: 8, scale: 4 }).notNull(),
  cac: decimal('cac', { precision: 10, scale: 2 }).notNull(), // Customer Acquisition Cost
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const modelProjections = pgTable('model_projections', {
  id: serial().primaryKey(),
  modelId: integer('model_id').references(() => financialModels.id, { onDelete: 'cascade' }).notNull(),
  scenarioType: scenarioTypeEnum('scenario_type').notNull(),
  year: integer('year').notNull(),
  // User metrics
  users: integer('users').notNull(),
  farmers: integer('farmers').notNull(),
  mau: integer('mau').notNull(), // Monthly Active Users
  newUsers: integer('new_users').notNull(),
  // Revenue
  platformRevenue: integer('platform_revenue').notNull(),
  farmerRevShare: integer('farmer_rev_share').notNull(),
  b2bRevenue: integer('b2b_revenue').notNull(),
  totalRevenue: integer('total_revenue').notNull(),
  // COGS
  hostingCosts: integer('hosting_costs').notNull(),
  paymentProcessing: integer('payment_processing').notNull(),
  customerSupport: integer('customer_support').notNull(),
  cogs: integer('cogs').notNull(),
  grossProfit: integer('gross_profit').notNull(),
  grossMargin: decimal('gross_margin', { precision: 5, scale: 2 }).notNull(),
  // Operating Expenses
  personnel: integer('personnel').notNull(),
  employees: integer('employees').notNull(),
  marketing: integer('marketing').notNull(),
  rd: integer('rd').notNull(), // R&D
  gna: integer('gna').notNull(), // G&A
  opex: integer('opex').notNull(),
  // EBITDA
  ebitda: integer('ebitda').notNull(),
  ebitdaMargin: decimal('ebitda_margin', { precision: 5, scale: 2 }).notNull(),
  // Depreciation & Taxes
  capex: integer('capex').notNull(),
  depreciation: integer('depreciation').notNull(),
  ebit: integer('ebit').notNull(),
  taxes: integer('taxes').notNull(),
  netIncome: integer('net_income').notNull(),
  // Working Capital
  accountsReceivable: integer('accounts_receivable').notNull(),
  accountsPayable: integer('accounts_payable').notNull(),
  workingCapital: integer('working_capital').notNull(),
  // Cash Flow
  operatingCF: integer('operating_cf').notNull(),
  investingCF: integer('investing_cf').notNull(),
  freeCashFlow: integer('free_cash_flow').notNull(),
  // KPIs
  ltv: integer('ltv').notNull(),
  ltvCac: decimal('ltv_cac', { precision: 5, scale: 2 }).notNull(),
  paybackMonths: integer('payback_months').notNull(),
  revenuePerEmployee: integer('revenue_per_employee').notNull(),
  marketShare: decimal('market_share', { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Market sizing data (TAM, SAM, SOM)
export const marketSizing = pgTable('market_sizing', {
  id: serial().primaryKey(),
  modelId: integer('model_id').references(() => financialModels.id, { onDelete: 'cascade' }).notNull(),
  tam: integer('tam').notNull(), // Total Available Market
  sam: integer('sam').notNull(), // Serviceable Available Market
  som: integer('som').array().notNull(), // Serviceable Obtainable Market (array for each year)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Model settings for configurable parameters
export const modelSettings = pgTable('model_settings', {
  id: serial().primaryKey(),
  modelId: integer('model_id').references(() => financialModels.id, { onDelete: 'cascade' }).notNull(),
  // Initial values
  startUsers: integer('start_users').default(1000).notNull(),
  startFarmers: integer('start_farmers').default(50).notNull(),
  // Tax and valuation
  taxRate: decimal('tax_rate', { precision: 8, scale: 4 }).default('0.12').notNull(), // 12% default
  discountRate: decimal('discount_rate', { precision: 8, scale: 4 }).default('0.30').notNull(), // 30% WACC
  terminalGrowth: decimal('terminal_growth', { precision: 8, scale: 4 }).default('0.03').notNull(), // 3%
  // Funding
  safetyBuffer: integer('safety_buffer').default(50000).notNull(),
  // Personnel by year (JSON array)
  personnelByYear: integer('personnel_by_year').array().default([36000, 72000, 144000, 216000, 288000]).notNull(),
  employeesByYear: integer('employees_by_year').array().default([2, 4, 8, 12, 16]).notNull(),
  capexByYear: integer('capex_by_year').array().default([15000, 10000, 20000, 15000, 10000]).notNull(),
  depreciationByYear: integer('depreciation_by_year').array().default([3750, 6250, 11250, 15000, 13750]).notNull(),
  // Years to project
  projectionYears: integer('projection_years').array().default([2025, 2026, 2027, 2028, 2029]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Relations
export const financialModelsRelations = relations(financialModels, ({ many, one }) => ({
  scenarios: many(modelScenarios),
  projections: many(modelProjections),
  marketSizing: many(marketSizing),
  settings: one(modelSettings),
}))

export const modelScenariosRelations = relations(modelScenarios, ({ one }) => ({
  model: one(financialModels, {
    fields: [modelScenarios.modelId],
    references: [financialModels.id],
  }),
}))

export const modelProjectionsRelations = relations(modelProjections, ({ one }) => ({
  model: one(financialModels, {
    fields: [modelProjections.modelId],
    references: [financialModels.id],
  }),
}))

export const marketSizingRelations = relations(marketSizing, ({ one }) => ({
  model: one(financialModels, {
    fields: [marketSizing.modelId],
    references: [financialModels.id],
  }),
}))

export const modelSettingsRelations = relations(modelSettings, ({ one }) => ({
  model: one(financialModels, {
    fields: [modelSettings.modelId],
    references: [financialModels.id],
  }),
}))
