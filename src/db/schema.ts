/**
 * Database schema.
 *
 * Mirrors docs/PRODUCT_PLAN.md §6.1. Two design rules from the plan are enforced
 * structurally here rather than left to application discipline:
 *
 *  - §6.4 (data honesty): measured facts and estimates live in different tables.
 *    `company_signal` holds only deterministic derivations and is NULL when the
 *    inputs are missing — it never carries a guess. Estimates live in
 *    `company_estimate` with their method, inputs and confidence attached.
 *
 *  - §3.2 (the response promise): a company cannot be published without
 *    `sla_accepted_at`, and every application carries its own `sla_due_at`.
 *    The weekly application cap has its own table because it is load-bearing
 *    and must be transactional, not cached.
 */

import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  vector,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

import { EMBEDDING_DIMENSIONS } from "@/lib/ai/workersAi";

// ---------------------------------------------------------------------------
// Better Auth — required tables, unchanged from the previous product.
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
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
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** Curator's verdict on whether a company is worth pursuing (§6.5 gate 3).
 *  Cached forever so the human decides once per company, not once per job. */
export const companyTrustStateEnum = pgEnum("company_trust_state", [
  "unreviewed",
  "qualified",
  "rejected",
]);

/** Outreach-to-onboarding funnel. Only `onboarded` is publicly visible (§3.3). */
export const companyLifecycleEnum = pgEnum("company_lifecycle", [
  "prospect",
  "contacted",
  "onboarding",
  "onboarded",
  "suspended",
]);

export const companyTierEnum = pgEnum("company_tier", ["free", "growth", "scale"]);

export const startupStageEnum = pgEnum("startup_stage", [
  "pre_seed",
  "seed",
  "series_a",
  "series_b_plus",
  "unknown",
]);

/** `prospect` = seen via aggregation, company not onboarded, never public. */
export const jobStatusEnum = pgEnum("job_status", [
  "prospect",
  "pending",
  "published",
  "archived",
  "rejected",
]);

export const autoDecisionEnum = pgEnum("auto_decision", ["approved", "rejected", "escalated"]);

/** Vertical per §0: engineering and product only. */
export const roleFamilyEnum = pgEnum("role_family", [
  "backend",
  "frontend",
  "fullstack",
  "mobile",
  "ml_ai",
  "infra_devops",
  "data",
  "security",
  "engineering_leadership",
  "product_management",
]);

export const seniorityEnum = pgEnum("seniority", [
  "junior",
  "mid",
  "senior",
  "staff",
  "principal",
  "lead",
]);

export const remoteTypeEnum = pgEnum("remote_type", ["remote", "hybrid", "onsite"]);

export const sourceKindEnum = pgEnum("source_kind", [
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "recruitee",
  "smartrecruiters",
  "rss",
  "crawl",
]);

/** Where a value came from — half of the honesty contract (§6.4). */
export const provenanceKindEnum = pgEnum("provenance_kind", [
  "ats_api",
  "funding_db",
  "company_claimed",
  "derived",
  "user_reported",
]);

export const confidenceEnum = pgEnum("confidence", ["high", "medium", "low"]);

export const moderationKindEnum = pgEnum("moderation_kind", [
  "new_company",
  "dedupe_ambiguous",
  "low_confidence",
  "claim",
  "user_report",
  "sla_breach",
  "audit_sample",
]);

export const moderationStateEnum = pgEnum("moderation_state", ["open", "resolved", "dismissed"]);

export const applicationStatusEnum = pgEnum("application_status", [
  "submitted",
  "in_review",
  "interviewing",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
]);

/**
 * Tracks the response promise per application (§3.2).
 *
 * `cancelled` exists so a candidate withdrawing does not count against the
 * company: punishing a company for someone else changing their mind would make
 * the published response rate dishonest in the other direction.
 */
export const slaStateEnum = pgEnum("sla_state", [
  "pending",
  "answered",
  "breached",
  "cancelled",
]);

export const outreachStateEnum = pgEnum("outreach_state", [
  "queued",
  "sent",
  "replied",
  "declined",
  "won",
]);

export const claimStateEnum = pgEnum("claim_state", [
  "pending",
  "domain_verified",
  "approved",
  "rejected",
]);

export const alertCadenceEnum = pgEnum("alert_cadence", ["off", "daily", "weekly"]);

export const profileVisibilityEnum = pgEnum("profile_visibility", [
  "hidden",
  "visible_to_onboarded",
  "public",
]);

export const userReportKindEnum = pgEnum("user_report_kind", [
  "dead",
  "wrong_salary",
  "not_startup",
  "spam",
  "other",
]);

export const blocklistKindEnum = pgEnum("blocklist_kind", ["domain", "company_name", "source"]);

/**
 * Where a piece of candidate history came from.
 *
 * `resume_parse` entries are proposals until confirmed (§6.2): a parse is not
 * truth, and treating it as such is the same error as printing a guessed runway.
 */
export const experienceSourceEnum = pgEnum("experience_source", [
  "candidate",
  "resume_parse",
]);

/**
 * A person's capability inside a company.
 *
 * Deliberately *not* a user type. Identity stays in a single `user` row and
 * capability comes from membership, because founders are frequently also
 * candidates — forcing a choice at signup would mean duplicate accounts and a
 * broken email uniqueness constraint.
 */
export const companyRoleEnum = pgEnum("company_role", [
  "owner",
  "admin",
  "recruiter",
  "viewer",
]);

export const inviteStateEnum = pgEnum("invite_state", [
  "pending",
  "accepted",
  "revoked",
  "expired",
]);

/**
 * Everything that can happen to an application.
 *
 * The distinction that matters commercially is which of these the candidate can
 * actually see. Only a candidate-visible event may satisfy the response promise
 * (§3.2) — see `src/lib/application/sla.ts`. Moving an application from
 * `submitted` to `in_review` changes nothing the candidate perceives, so if it
 * cleared the SLA a company could discharge its obligation by clicking a button
 * and the promise would become theatre.
 */
export const applicationEventKindEnum = pgEnum("application_event_kind", [
  // Internal — invisible to the candidate, never satisfies the SLA.
  "submitted",
  "status_changed",
  "internal_note",
  "assigned",
  // Candidate-visible — these are what count as a response.
  "message_to_candidate",
  "decision",
  // From the candidate — never counts as the company's response.
  "candidate_message",
  "candidate_withdrew",
]);

export const dataRequestKindEnum = pgEnum("data_request_kind", ["export", "delete"]);

export const dataRequestStateEnum = pgEnum("data_request_state", [
  "pending",
  "completed",
  "rejected",
]);

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

export const company = pgTable(
  "company",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    /** Corporate domain — the key for dedupe and for claim verification. */
    domain: text("domain"),
    description: text("description"),
    logoR2Key: text("logo_r2_key"),
    website: text("website"),
    hqLocation: text("hq_location"),
    remotePolicy: text("remote_policy"),
    teamSize: integer("team_size"),
    teamSizeUpdatedAt: timestamp("team_size_updated_at"),
    stage: startupStageEnum("stage").default("unknown").notNull(),
    foundedYear: integer("founded_year"),

    // Ownership is not stored here. A company is "claimed" exactly when it has a
    // `company_member` with role 'owner'; the funnel position is `lifecycle`.
    // Two flags saying the same thing is how they end up disagreeing.
    tier: companyTierEnum("tier").default("free").notNull(),

    atsProvider: sourceKindEnum("ats_provider"),
    atsExternalId: text("ats_external_id"),

    // Prospect qualification, cached forever (§6.5).
    trustState: companyTrustStateEnum("trust_state").default("unreviewed").notNull(),
    trustReason: text("trust_reason"),
    trustReviewedBy: text("trust_reviewed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    trustReviewedAt: timestamp("trust_reviewed_at"),

    lifecycle: companyLifecycleEnum("lifecycle").default("prospect").notNull(),

    // The response promise (§3.2). Without sla_accepted_at nothing publishes.
    slaResponseDays: integer("sla_response_days"),
    slaAcceptedAt: timestamp("sla_accepted_at"),
    slaAcceptedByUserId: text("sla_accepted_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    /**
     * Which version of the terms this company actually agreed to.
     *
     * Without it, changing SLA_RESPONSE_DAYS would silently restate every
     * existing company's public promise as something they never accepted. The
     * accepted `sla_response_days` above stays authoritative for their
     * applications; this records the wording behind it.
     */
    slaTermsVersion: text("sla_terms_version"),
    /** Corporate-domain proof that this company is really theirs. */
    domainVerifiedAt: timestamp("domain_verified_at"),
    responseRate30d: numeric("response_rate_30d", { precision: 5, scale: 4 }),
    medianFirstResponseHours: integer("median_first_response_hours"),
    slaBreachCount: integer("sla_breach_count").default(0).notNull(),
    suspendedForSlaAt: timestamp("suspended_for_sla_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("company_domain_idx").on(table.domain),
    index("company_lifecycle_idx").on(table.lifecycle),
    index("company_trust_state_idx").on(table.trustState),
    index("company_stage_idx").on(table.stage),
  ],
);

// ---------------------------------------------------------------------------
// Company members — the manager model
// ---------------------------------------------------------------------------

/**
 * A person acting on behalf of a company.
 *
 * This is the entity the response promise is actually enforced against. The SLA
 * is a commitment made by people, and reminders have to reach someone by name:
 * "your company owes replies" is ignored, "you owe three replies by Friday" is
 * not. Hence `job.hiring_manager_member_id`, `application.assignee_member_id`
 * and `is_sla_contact` as the company-wide fallback.
 */
export const companyMember = pgTable(
  "company_member",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: companyRoleEnum("role").notNull(),
    /** Job title inside the company, shown to candidates on a reply. */
    title: text("title"),
    /** Corporate address used to verify the person belongs to the company. */
    workEmail: text("work_email"),
    workEmailVerifiedAt: timestamp("work_email_verified_at"),

    /**
     * Fallback recipient for SLA reminders when a role or application has no
     * explicit assignee. At most one per company — enforced by a partial unique
     * index, not by application code.
     */
    isSlaContact: boolean("is_sla_contact").default(false).notNull(),
    notifyOnNewApplication: boolean("notify_on_new_application").default(true).notNull(),

    invitedByUserId: text("invited_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    /** Soft removal: past members must stay referenced by historical events. */
    removedAt: timestamp("removed_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("company_member_company_user_idx").on(table.companyId, table.userId),
    index("company_member_user_id_idx").on(table.userId),
    index("company_member_company_role_idx").on(table.companyId, table.role),
    // Exactly one SLA contact per company, at the database level.
    uniqueIndex("company_member_sla_contact_idx")
      .on(table.companyId)
      .where(sql`${table.isSlaContact} AND ${table.removedAt} IS NULL`),
  ],
);

export const companyInvite = pgTable(
  "company_invite",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: companyRoleEnum("role").notNull(),
    /** Single-use secret from the invitation link. */
    token: text("token").notNull().unique(),
    state: inviteStateEnum("state").default("pending").notNull(),
    invitedByUserId: text("invited_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    acceptedByUserId: text("accepted_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("company_invite_company_id_idx").on(table.companyId),
    // One live invitation per address per company; re-inviting revokes the old.
    uniqueIndex("company_invite_company_email_idx")
      .on(table.companyId, table.email)
      .where(sql`${table.state} = 'pending'`),
  ],
);

export const companyFunding = pgTable(
  "company_funding",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    roundType: text("round_type").notNull(),
    amountUsd: numeric("amount_usd", { precision: 16, scale: 2 }),
    announcedAt: date("announced_at"),
    leadInvestor: text("lead_investor"),
    investors: jsonb("investors").$type<string[]>(),
    sourceKind: provenanceKindEnum("source_kind").notNull(),
    sourceUrl: text("source_url"),
    /** When this fact was true, not when we wrote the row (§6.4 rule 1). */
    asOf: timestamp("as_of").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("company_funding_company_id_idx").on(table.companyId)],
);

/**
 * Deterministic derivations only.
 *
 * Every value here is computed from data we actually hold. If an input is
 * missing the column stays NULL and the UI renders "no data" — we never
 * substitute a guess (§6.4 rule 2). Each value carries its own `as_of` because
 * a number without a date is not a fact.
 */
export const companySignal = pgTable("company_signal", {
  companyId: text("company_id")
    .primaryKey()
    .references(() => company.id, { onDelete: "cascade" }),

  monthsSinceLastRaise: integer("months_since_last_raise"),
  monthsSinceLastRaiseAsOf: timestamp("months_since_last_raise_as_of"),

  teamGrowthRate90d: numeric("team_growth_rate_90d", { precision: 6, scale: 4 }),
  teamGrowthRate90dAsOf: timestamp("team_growth_rate_90d_as_of"),

  openRolesCount: integer("open_roles_count"),
  openRolesCountAsOf: timestamp("open_roles_count_as_of"),

  medianDaysToFirstResponse: integer("median_days_to_first_response"),
  medianDaysToFirstResponseAsOf: timestamp("median_days_to_first_response_as_of"),

  hiringMix: jsonb("hiring_mix").$type<Record<string, number>>(),
  hiringMixAsOf: timestamp("hiring_mix_as_of"),

  computedAt: timestamp("computed_at").defaultNow().notNull(),
});

/**
 * Explicit estimates, kept apart from facts.
 *
 * Anything inferred rather than observed lands here with its method and inputs
 * recorded, so the UI can show how a number was reached (§6.4 rule 3). A company
 * can dispute a value, which removes it from display immediately — before any
 * human review (§6.4 rule 5).
 */
export const companyEstimate = pgTable(
  "company_estimate",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    /** e.g. "runway_months", "burn_rate_usd" */
    key: text("key").notNull(),
    valueNumeric: numeric("value_numeric", { precision: 16, scale: 4 }),
    /** Human-readable description of how the value was derived. */
    method: text("method").notNull(),
    /** The exact inputs used, so an estimate is always reproducible. */
    inputs: jsonb("inputs").$type<Record<string, unknown>>().notNull(),
    confidence: confidenceEnum("confidence").notNull(),
    asOf: timestamp("as_of").notNull(),
    isDisputed: boolean("is_disputed").default(false).notNull(),
    disputedByCompanyAt: timestamp("disputed_by_company_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("company_estimate_company_key_idx").on(table.companyId, table.key)],
);

export const companyHeadcount = pgTable(
  "company_headcount",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    observedAt: timestamp("observed_at").notNull(),
    headcount: integer("headcount").notNull(),
    sourceKind: provenanceKindEnum("source_kind").notNull(),
  },
  (table) => [
    uniqueIndex("company_headcount_company_observed_idx").on(table.companyId, table.observedAt),
  ],
);

export const blocklist = pgTable(
  "blocklist",
  {
    id: text("id").primaryKey(),
    kind: blocklistKindEnum("kind").notNull(),
    /** Matched case-insensitively against domain / name / source id. */
    pattern: text("pattern").notNull(),
    reason: text("reason").notNull(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("blocklist_kind_pattern_idx").on(table.kind, table.pattern)],
);

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export const job = pgTable(
  "job",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    roleFamily: roleFamilyEnum("role_family"),
    seniority: seniorityEnum("seniority"),
    descriptionMd: text("description_md"),

    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    salaryCurrency: text("salary_currency"),
    /** False means the company hid the band — shown as such, never guessed. */
    salaryIsPublic: boolean("salary_is_public").default(false).notNull(),
    equityMin: numeric("equity_min", { precision: 8, scale: 5 }),
    equityMax: numeric("equity_max", { precision: 8, scale: 5 }),

    /**
     * Who owes candidates a reply for this role. Applications inherit it as
     * their assignee, so the SLA always has a name attached (§3.2).
     */
    hiringManagerMemberId: text("hiring_manager_member_id").references(
      () => companyMember.id,
      { onDelete: "set null" },
    ),

    remoteType: remoteTypeEnum("remote_type"),
    timezones: text("timezones").array(),
    locations: text("locations").array(),
    visaSponsorship: boolean("visa_sponsorship"),
    techStack: text("tech_stack").array(),

    status: jobStatusEnum("status").default("prospect").notNull(),

    firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
    lastVerifiedAt: timestamp("last_verified_at").defaultNow().notNull(),
    publishedAt: timestamp("published_at"),
    archivedAt: timestamp("archived_at"),
    applyUrl: text("apply_url"),

    sourceId: text("source_id").references(() => source.id, { onDelete: "set null" }),
    sourceExternalId: text("source_external_id"),
    /** Set when this row was merged into another as a duplicate. */
    canonicalJobId: text("canonical_job_id"),
    contentHash: text("content_hash").notNull(),

    // Per-field normalization confidence drives gate 2 of automoderation (§6.5).
    fieldConfidence: jsonb("field_confidence").$type<Record<string, number>>(),
    autoDecision: autoDecisionEnum("auto_decision"),
    autoDecisionRule: text("auto_decision_rule"),
    autoDecisionAt: timestamp("auto_decision_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("job_company_id_idx").on(table.companyId),
    index("job_status_idx").on(table.status),
    index("job_role_family_idx").on(table.roleFamily),
    index("job_last_verified_at_idx").on(table.lastVerifiedAt),
    uniqueIndex("job_source_external_idx").on(table.sourceId, table.sourceExternalId),
    index("job_content_hash_idx").on(table.contentHash),
  ],
);

export const jobEmbedding = pgTable(
  "job_embedding",
  {
    jobId: text("job_id")
      .primaryKey()
      .references(() => job.id, { onDelete: "cascade" }),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
    /** Which model produced this vector — a model change invalidates every row. */
    model: text("model").notNull(),
    computedAt: timestamp("computed_at").defaultNow().notNull(),
  },
  (table) => [
    // HNSW over cosine distance: matching ranks by direction, not magnitude (§6.2).
    index("job_embedding_hnsw_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ],
);

// ---------------------------------------------------------------------------
// Ingest / prospecting (internal contour — never published, §3.3)
// ---------------------------------------------------------------------------

export const source = pgTable(
  "source",
  {
    id: text("id").primaryKey(),
    kind: sourceKindEnum("kind").notNull(),
    /** Board token, feed URL, and any adapter-specific settings. */
    config: jsonb("config").$type<Record<string, unknown>>().notNull(),
    isEnabled: boolean("is_enabled").default(true).notNull(),
    lastRunAt: timestamp("last_run_at"),
    health: text("health"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("source_kind_idx").on(table.kind)],
);

export const ingestRun = pgTable(
  "ingest_run",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => source.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    finishedAt: timestamp("finished_at"),
    fetched: integer("fetched").default(0).notNull(),
    created: integer("created").default(0).notNull(),
    updated: integer("updated").default(0).notNull(),
    archived: integer("archived").default(0).notNull(),
    errors: jsonb("errors").$type<unknown[]>(),
  },
  (table) => [index("ingest_run_source_id_idx").on(table.sourceId)],
);

export const rawPosting = pgTable(
  "raw_posting",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => source.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    /** Raw payload lives in R2; only the pointer is in Postgres. */
    r2Key: text("r2_key").notNull(),
    contentHash: text("content_hash").notNull(),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("raw_posting_source_external_idx").on(table.sourceId, table.externalId)],
);

/**
 * The single human queue (§6.5 gate 3).
 *
 * Priority ordering is intentional: things that break the promise for live
 * users (`sla_breach`, `user_report`) outrank things that grow the database
 * (`new_company`).
 */
export const moderationItem = pgTable(
  "moderation_item",
  {
    id: text("id").primaryKey(),
    kind: moderationKindEnum("kind").notNull(),
    companyId: text("company_id").references(() => company.id, { onDelete: "cascade" }),
    jobId: text("job_id").references(() => job.id, { onDelete: "cascade" }),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    priority: integer("priority").default(0).notNull(),
    state: moderationStateEnum("state").default("open").notNull(),
    resolution: text("resolution"),
    curatorId: text("curator_id").references(() => user.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
  },
  (table) => [
    index("moderation_item_state_priority_idx").on(table.state, table.priority),
    index("moderation_item_kind_idx").on(table.kind),
  ],
);

export const userReport = pgTable(
  "user_report",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => job.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    kind: userReportKindEnum("kind").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("user_report_job_id_idx").on(table.jobId)],
);

/** Minimal outreach CRM over the prospecting list (§3.3). */
export const outreach = pgTable(
  "outreach",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    state: outreachStateEnum("state").default("queued").notNull(),
    /** Ranks the list — freshly opened roles are the best cold-email trigger. */
    hiringIntentScore: numeric("hiring_intent_score", { precision: 6, scale: 3 }),
    contactedAt: timestamp("contacted_at"),
    repliedAt: timestamp("replied_at"),
    note: text("note"),
    ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("outreach_company_id_idx").on(table.companyId),
    index("outreach_state_score_idx").on(table.state, table.hiringIntentScore),
  ],
);

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

export const candidateProfile = pgTable("candidate_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  headline: text("headline"),
  bio: text("bio"),
  yearsExperience: integer("years_experience"),
  // Enum arrays rather than text[]: these drive the hard filters of matching
  // (§6.2), so a typo must fail at write time, not silently exclude a candidate
  // from every search.
  roleFamilies: roleFamilyEnum("role_families").array(),
  seniority: seniorityEnum("seniority"),
  techStack: text("tech_stack").array(),
  timezone: text("timezone"),
  locations: text("locations").array(),
  needsVisa: boolean("needs_visa"),
  openTo: remoteTypeEnum("open_to"),
  salaryExpectationMin: integer("salary_expectation_min"),
  preferredStages: startupStageEnum("preferred_stages").array(),
  resumeR2Key: text("resume_r2_key"),
  resumeUploadedAt: timestamp("resume_uploaded_at"),
  /** Output of the unpdf + LLM parse, kept for re-derivation without re-upload. */
  resumeParsed: jsonb("resume_parsed").$type<Record<string, unknown>>(),
  resumeParsedAt: timestamp("resume_parsed_at"),
  /** Which model produced the parse, so a proposal from a model we later replace
   *  can be re-run rather than silently trusted. */
  resumeParseModel: text("resume_parse_model"),
  /** Null while the parse is still a proposal awaiting the candidate (§6.2). */
  resumeConfirmedAt: timestamp("resume_confirmed_at"),
  visibility: profileVisibilityEnum("visibility").default("hidden").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const candidateEmbedding = pgTable(
  "candidate_embedding",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
    model: text("model").notNull(),
    computedAt: timestamp("computed_at").defaultNow().notNull(),
  },
  (table) => [
    index("candidate_embedding_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);

/**
 * Career trajectory, not just a skill list.
 *
 * The stage and team size at join time are what make trajectory matching
 * possible (§6.2) — "was third engineer at a seed startup" is the signal,
 * and it cannot be expressed as tags.
 */
export const candidateExperience = pgTable(
  "candidate_experience",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    companyName: text("company_name").notNull(),
    companyStageAtJoin: startupStageEnum("company_stage_at_join"),
    teamSizeAtJoin: integer("team_size_at_join"),
    title: text("title").notNull(),
    startedAt: date("started_at"),
    endedAt: date("ended_at"),
    wasFirstInFunction: boolean("was_first_in_function"),

    source: experienceSourceEnum("source").default("candidate").notNull(),
    /**
     * Only confirmed history feeds matching. A parsed entry sits here unconfirmed
     * until the candidate accepts or corrects it, so an unreviewed parse can
     * never silently shape who sees which roles.
     */
    confirmedAt: timestamp("confirmed_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("candidate_experience_user_id_idx").on(table.userId),
    // Drives confirmedExperienceCount in the onboarding status.
    index("candidate_experience_confirmed_idx")
      .on(table.userId)
      .where(sql`${table.confirmedAt} IS NOT NULL`),
  ],
);

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------

export const application = pgTable(
  "application",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => job.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: applicationStatusEnum("status").default("submitted").notNull(),
    coverLetter: text("cover_letter"),
    appliedAt: timestamp("applied_at").defaultNow().notNull(),

    /**
     * The person accountable for replying. Inherited from
     * `job.hiring_manager_member_id` at submission, reassignable afterwards, and
     * falling back to the company's `is_sla_contact` member when null.
     */
    assigneeMemberId: text("assignee_member_id").references(() => companyMember.id, {
      onDelete: "set null",
    }),

    /**
     * When the candidate first heard back.
     *
     * Derived from `application_event`, and only ever from a candidate-visible
     * one — an internal status change is not a response (see
     * src/lib/application/sla.ts). Stored rather than recomputed because the SLA
     * sweep and the public response-rate query both read it hot.
     */
    firstResponseAt: timestamp("first_response_at"),

    // The promise, per application (§3.2).
    slaDueAt: timestamp("sla_due_at").notNull(),
    slaState: slaStateEnum("sla_state").default("pending").notNull(),
    remindedAt: timestamp("reminded_at"),
    breachedAt: timestamp("breached_at"),
  },
  (table) => [
    uniqueIndex("application_job_user_idx").on(table.jobId, table.userId),
    index("application_user_id_idx").on(table.userId),
    // Drives the hourly SLA sweep.
    index("application_sla_state_due_idx").on(table.slaState, table.slaDueAt),
    // Drives a member's "what do I owe" queue.
    index("application_assignee_sla_idx").on(table.assigneeMemberId, table.slaState),
  ],
);

/**
 * Append-only history of an application.
 *
 * Replaces the `status_history` JSONB column of the first schema draft. JSONB
 * could not support the two things this table exists for: proving an SLA breach,
 * and aggregating median response time across a company. Both need indexed,
 * queryable rows.
 *
 * `is_candidate_visible` is denormalised from `kind` on purpose — it is the
 * single predicate the response promise depends on, so it must be indexable and
 * auditable rather than recomputed from an enum at read time.
 */
export const applicationEvent = pgTable(
  "application_event",
  {
    id: text("id").primaryKey(),
    applicationId: text("application_id")
      .notNull()
      .references(() => application.id, { onDelete: "cascade" }),
    kind: applicationEventKindEnum("kind").notNull(),

    /** Null for system-generated events (SLA sweep, ingest). */
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    /** Set when the actor acted as a company member, for per-member metrics. */
    actorMemberId: text("actor_member_id").references(() => companyMember.id, {
      onDelete: "set null",
    }),

    /**
     * Whether the candidate perceives this event, i.e. whether it belongs in the
     * timeline they see. Necessary for satisfying the SLA but not sufficient:
     * the event must also come from the company. See
     * `countsAsCompanyResponse` in src/lib/application/sla.ts.
     */
    isCandidateVisible: boolean("is_candidate_visible").notNull(),

    fromStatus: applicationStatusEnum("from_status"),
    toStatus: applicationStatusEnum("to_status"),
    /** Message text or internal note, depending on `kind`. */
    body: text("body"),

    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  },
  (table) => [
    index("application_event_application_idx").on(table.applicationId, table.occurredAt),
    // Finding the first company response is the hottest read in the SLA
    // machinery. The predicate is the response definition itself, not plain
    // visibility — a candidate's own message is visible to them but is not an
    // answer from the company.
    index("application_event_response_idx")
      .on(table.applicationId, table.occurredAt)
      .where(sql`${table.kind} IN ('message_to_candidate', 'decision')`),
    index("application_event_actor_member_idx").on(table.actorMemberId, table.occurredAt),
  ],
);

/**
 * Weekly application cap (§3.2).
 *
 * Deliberately in Postgres rather than KV: the cap is what makes the response
 * promise achievable, so it must be transactional. KV's eventual consistency
 * would let a candidate exceed it by racing requests.
 */
export const applicationQuota = pgTable(
  "application_quota",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Monday 00:00 UTC of the quota week. */
    windowStart: date("window_start").notNull(),
    used: integer("used").default(0).notNull(),
    limitPerWindow: integer("limit_per_window").notNull(),
  },
  (table) => [uniqueIndex("application_quota_user_window_idx").on(table.userId, table.windowStart)],
);

export const savedJob = pgTable(
  "saved_job",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    jobId: text("job_id")
      .notNull()
      .references(() => job.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("saved_job_user_job_idx").on(table.userId, table.jobId)],
);

export const savedSearch = pgTable(
  "saved_search",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    filters: jsonb("filters").$type<Record<string, unknown>>().notNull(),
    alertCadence: alertCadenceEnum("alert_cadence").default("off").notNull(),
    lastSentAt: timestamp("last_sent_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("saved_search_user_id_idx").on(table.userId)],
);

export const jobView = pgTable(
  "job_view",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => job.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    /** Hashed, not raw — anonymous views must not be re-identifiable. */
    sessionHash: text("session_hash"),
    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  },
  (table) => [index("job_view_job_id_occurred_idx").on(table.jobId, table.occurredAt)],
);

/**
 * GDPR export and deletion requests.
 *
 * In the MVP by decision, not deferred (docs/PRODUCT_PLAN.md §6.3): we hold
 * résumés and career histories, so the right to export and erase has to exist
 * from the first candidate onward rather than being retrofitted.
 */
export const dataRequest = pgTable(
  "data_request",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: dataRequestKindEnum("kind").notNull(),
    state: dataRequestStateEnum("state").default("pending").notNull(),
    /** Where the generated export archive lives in R2, for `kind = 'export'`. */
    exportR2Key: text("export_r2_key"),
    note: text("note"),
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("data_request_state_idx").on(table.state, table.requestedAt),
    // One open request per kind per user; repeated clicks must not queue work.
    uniqueIndex("data_request_user_kind_open_idx")
      .on(table.userId, table.kind)
      .where(sql`${table.state} = 'pending'`),
  ],
);

export const companyClaim = pgTable(
  "company_claim",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workEmail: text("work_email").notNull(),
    state: claimStateEnum("state").default("pending").notNull(),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("company_claim_company_id_idx").on(table.companyId)],
);

// ---------------------------------------------------------------------------
// Billing (carried over, retargeted at the new tiers)
// ---------------------------------------------------------------------------

export const billingSubscriptions = pgTable(
  "billing_subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    companyId: text("company_id").references(() => company.id, { onDelete: "set null" }),
    provider: text("provider").default("polar").notNull(),
    externalId: text("external_id"),
    productId: text("product_id"),
    status: text("status").notNull(),
    currentPeriodEnd: timestamp("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    raw: jsonb("raw").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("billing_subscriptions_user_id_idx").on(table.userId),
    uniqueIndex("billing_subscriptions_external_id_idx").on(table.provider, table.externalId),
  ],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  applications: many(application),
  savedJobs: many(savedJob),
  savedSearches: many(savedSearch),
  experience: many(candidateExperience),
  dataRequests: many(dataRequest),
  // A user can hold both sides at once: `profile` present and `memberships`
  // non-empty is a valid, expected state for a founder who is also job-hunting.
  memberships: many(companyMember),
  profile: one(candidateProfile, {
    fields: [user.id],
    references: [candidateProfile.userId],
  }),
}));

export const companyMemberRelations = relations(companyMember, ({ one, many }) => ({
  company: one(company, {
    fields: [companyMember.companyId],
    references: [company.id],
  }),
  user: one(user, { fields: [companyMember.userId], references: [user.id] }),
  managedJobs: many(job),
  assignedApplications: many(application),
}));

export const companyInviteRelations = relations(companyInvite, ({ one }) => ({
  company: one(company, {
    fields: [companyInvite.companyId],
    references: [company.id],
  }),
}));

export const applicationEventRelations = relations(applicationEvent, ({ one }) => ({
  application: one(application, {
    fields: [applicationEvent.applicationId],
    references: [application.id],
  }),
  actorMember: one(companyMember, {
    fields: [applicationEvent.actorMemberId],
    references: [companyMember.id],
  }),
}));

export const dataRequestRelations = relations(dataRequest, ({ one }) => ({
  user: one(user, { fields: [dataRequest.userId], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const companyRelations = relations(company, ({ many, one }) => ({
  jobs: many(job),
  members: many(companyMember),
  invites: many(companyInvite),
  funding: many(companyFunding),
  headcount: many(companyHeadcount),
  estimates: many(companyEstimate),
  claims: many(companyClaim),
  signal: one(companySignal, {
    fields: [company.id],
    references: [companySignal.companyId],
  }),
  outreach: one(outreach, {
    fields: [company.id],
    references: [outreach.companyId],
  }),
}));

export const jobRelations = relations(job, ({ one, many }) => ({
  company: one(company, { fields: [job.companyId], references: [company.id] }),
  hiringManager: one(companyMember, {
    fields: [job.hiringManagerMemberId],
    references: [companyMember.id],
  }),
  source: one(source, { fields: [job.sourceId], references: [source.id] }),
  embedding: one(jobEmbedding, {
    fields: [job.id],
    references: [jobEmbedding.jobId],
  }),
  applications: many(application),
  reports: many(userReport),
}));

export const applicationRelations = relations(application, ({ one, many }) => ({
  job: one(job, { fields: [application.jobId], references: [job.id] }),
  user: one(user, { fields: [application.userId], references: [user.id] }),
  assignee: one(companyMember, {
    fields: [application.assigneeMemberId],
    references: [companyMember.id],
  }),
  events: many(applicationEvent),
}));

export const candidateProfileRelations = relations(candidateProfile, ({ one }) => ({
  user: one(user, { fields: [candidateProfile.userId], references: [user.id] }),
  embedding: one(candidateEmbedding, {
    fields: [candidateProfile.userId],
    references: [candidateEmbedding.userId],
  }),
}));

export const sourceRelations = relations(source, ({ many }) => ({
  jobs: many(job),
  runs: many(ingestRun),
  rawPostings: many(rawPosting),
}));
