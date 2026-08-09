import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";

import type { Database } from "@/db/index";
import {
  application,
  applicationEvent,
  applicationQuota,
  candidateProfile,
  company,
  job,
  savedJob,
} from "@/db/schema";
import { WEEKLY_APPLICATION_LIMIT } from "@/config/brand";
import { computeSlaDueAt } from "@/lib/application/sla";
import {
  checkEligibility,
  currentQuotaWindow,
  nextQuotaReset,
  scoreMatch,
  type CandidateConstraints,
  type Eligibility,
  type MatchReason,
  type RoleConstraints,
} from "@/lib/matching/eligibility";
import { REQUIREMENT_REASONS } from "@/lib/candidate/onboarding";
import { getProfileStatus } from "@/lib/candidate/service";

/**
 * Searching and applying, from the candidate's side
 * (docs/PRODUCT_PLAN.md §3.2, §6.2).
 *
 * Three gates stand between a candidate and an application, in this order:
 * a complete enough profile, a meaningful match, and the weekly allowance.
 * Each one exists to keep the volume reaching companies answerable, because the
 * response promise is only worth making if it can be kept.
 */

const newId = () => crypto.randomUUID();

/** A database handle or an open transaction, derived rather than cast. */
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type DbOrTx = Database | Transaction;

export class ApplyError extends Error {
  constructor(
    message: string,
    readonly code:
      | "profile_incomplete"
      | "not_eligible"
      | "quota_exhausted"
      | "already_applied"
      | "role_unavailable",
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApplyError";
  }
}

export type QuotaState = {
  limit: number;
  used: number;
  remaining: number;
  /** ISO date of the Monday this window began. */
  windowStart: string;
  resetsAt: Date;
};

export const getQuota = async (
  db: Database,
  userId: string,
  now: Date = new Date(),
): Promise<QuotaState> => {
  const windowStart = currentQuotaWindow(now);

  const row = await db.query.applicationQuota.findFirst({
    where: and(
      eq(applicationQuota.userId, userId),
      eq(applicationQuota.windowStart, windowStart),
    ),
  });

  const limit = row?.limitPerWindow ?? WEEKLY_APPLICATION_LIMIT;
  const used = row?.used ?? 0;

  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    windowStart,
    resetsAt: nextQuotaReset(now),
  };
};

/**
 * Claims one application from this week's allowance.
 *
 * Written as a single conditional statement rather than read-then-write. The cap
 * is load-bearing (§3.2) — it is what makes the response promise achievable — so
 * two tabs racing must not be able to exceed it. `ON CONFLICT ... WHERE` makes
 * the check and the increment one atomic operation, and a zero row count means
 * the allowance was already spent.
 */
const claimQuotaSlot = async (
  tx: DbOrTx,
  userId: string,
  windowStart: string,
  limit: number,
): Promise<boolean> => {
  const result = await tx.execute(sql`
    INSERT INTO application_quota (user_id, window_start, used, limit_per_window)
    VALUES (${userId}, ${windowStart}, 1, ${limit})
    ON CONFLICT (user_id, window_start) DO UPDATE
      SET used = application_quota.used + 1
      WHERE application_quota.used < application_quota.limit_per_window
    RETURNING used
  `);

  return (result.rowCount ?? 0) > 0;
};

const toCandidateConstraints = (
  profile: typeof candidateProfile.$inferSelect,
): CandidateConstraints => ({
  roleFamilies: profile.roleFamilies ?? [],
  seniority: profile.seniority,
  timezone: profile.timezone,
  openTo: profile.openTo,
  needsVisa: profile.needsVisa,
  salaryExpectationMin: profile.salaryExpectationMin,
  preferredStages: profile.preferredStages,
  techStack: profile.techStack,
});

const toRoleConstraints = (
  roleRow: typeof job.$inferSelect,
  stage: typeof company.$inferSelect.stage,
): RoleConstraints => ({
  roleFamily: roleRow.roleFamily,
  seniority: roleRow.seniority,
  remoteType: roleRow.remoteType,
  visaSponsorship: roleRow.visaSponsorship,
  salaryIsPublic: roleRow.salaryIsPublic,
  salaryMin: roleRow.salaryMin,
  salaryMax: roleRow.salaryMax,
  techStack: roleRow.techStack,
  companyStage: stage,
});

export type SearchFilters = {
  roleFamilies?: string[];
  seniority?: string[];
  remoteType?: string[];
  minSalary?: number;
  /** Hide roles the candidate cannot apply to. On by default. */
  onlyEligible?: boolean;
  limit?: number;
};

export type SearchResult = {
  id: string;
  title: string;
  companyName: string;
  companySlug: string;
  companyStage: string;
  responseRate: number | null;
  slaResponseDays: number | null;
  roleFamily: string | null;
  seniority: string | null;
  remoteType: string | null;
  salaryIsPublic: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  publishedAt: Date | null;
  score: number;
  reasons: MatchReason[];
  eligibility: Eligibility;
  alreadyApplied: boolean;
};

/**
 * The candidate's feed.
 *
 * Ranked by structural match, then by how well the company answers. The second
 * term is deliberate: a slightly worse fit at a company that always replies is a
 * better use of one of eight weekly applications than a perfect fit at one that
 * never does.
 */
export const searchRoles = async (
  db: Database,
  userId: string | null,
  filters: SearchFilters = {},
): Promise<SearchResult[]> => {
  const conditions = [
    eq(job.status, "published"),
    eq(company.lifecycle, "onboarded"),
    isNotNull(company.slaAcceptedAt),
    isNotNull(company.domainVerifiedAt),
  ];

  if (filters.roleFamilies?.length) {
    conditions.push(inArray(job.roleFamily, filters.roleFamilies as never));
  }
  if (filters.seniority?.length) {
    conditions.push(inArray(job.seniority, filters.seniority as never));
  }
  if (filters.remoteType?.length) {
    conditions.push(inArray(job.remoteType, filters.remoteType as never));
  }
  if (filters.minSalary) {
    conditions.push(sql`${job.salaryMax} IS NULL OR ${job.salaryMax} >= ${filters.minSalary}`);
  }

  const rows = await db
    .select({ job, company })
    .from(job)
    .innerJoin(company, eq(company.id, job.companyId))
    .where(and(...conditions))
    .orderBy(desc(job.publishedAt))
    .limit(filters.limit ?? 60);

  const profile = userId
    ? await db.query.candidateProfile.findFirst({
        where: eq(candidateProfile.userId, userId),
      })
    : null;

  const applied = userId
    ? new Set(
        (
          await db
            .select({ jobId: application.jobId })
            .from(application)
            .where(eq(application.userId, userId))
        ).map((row) => row.jobId),
      )
    : new Set<string>();

  const constraints = profile ? toCandidateConstraints(profile) : null;

  const results = rows.map(({ job: roleRow, company: companyRow }) => {
    const roleConstraints = toRoleConstraints(roleRow, companyRow.stage);
    const eligibility = constraints
      ? checkEligibility(constraints, roleConstraints)
      : { allowed: true, blockers: [], reasons: [] };
    const match = constraints
      ? scoreMatch(constraints, roleConstraints)
      : { score: 0, reasons: [] };

    return {
      id: roleRow.id,
      title: roleRow.title,
      companyName: companyRow.name,
      companySlug: companyRow.slug,
      companyStage: companyRow.stage,
      responseRate:
        companyRow.responseRate30d === null ? null : Number(companyRow.responseRate30d),
      slaResponseDays: companyRow.slaResponseDays,
      roleFamily: roleRow.roleFamily,
      seniority: roleRow.seniority,
      remoteType: roleRow.remoteType,
      salaryIsPublic: roleRow.salaryIsPublic,
      salaryMin: roleRow.salaryMin,
      salaryMax: roleRow.salaryMax,
      salaryCurrency: roleRow.salaryCurrency,
      publishedAt: roleRow.publishedAt,
      score: match.score,
      reasons: match.reasons,
      eligibility,
      alreadyApplied: applied.has(roleRow.id),
    };
  });

  const visible = filters.onlyEligible === false
    ? results
    : results.filter((result) => result.eligibility.allowed);

  return visible.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Unmeasured companies rank between good and bad answerers rather than
    // last: having no record yet is not evidence of a bad one (§6.4 rule 2).
    const rate = (value: number | null) => (value === null ? 0.5 : value);
    return rate(b.responseRate) - rate(a.responseRate);
  });
};

export type ApplyResult = {
  applicationId: string;
  slaDueAt: Date;
  quota: QuotaState;
};

/**
 * Submits an application.
 *
 * Order matters: the profile and match checks run before the quota is touched,
 * so a rejected attempt never costs the candidate one of their eight.
 */
export const applyToRole = async (
  db: Database,
  userId: string,
  input: { jobId: string; coverLetter?: string | null },
  now: Date = new Date(),
): Promise<ApplyResult> => {
  const { status } = await getProfileStatus(db, userId);

  if (!status.canApply) {
    throw new ApplyError("Complete your profile before applying", "profile_incomplete", {
      missing: status.missing,
      reasons: status.missing.map((requirement) => REQUIREMENT_REASONS[requirement]),
    });
  }

  const rows = await db
    .select({ job, company })
    .from(job)
    .innerJoin(company, eq(company.id, job.companyId))
    .where(and(eq(job.id, input.jobId), eq(job.status, "published")))
    .limit(1);

  if (rows.length === 0) {
    throw new ApplyError("This role is no longer open", "role_unavailable");
  }

  const { job: roleRow, company: companyRow } = rows[0];

  if (!companyRow.slaAcceptedAt || !companyRow.domainVerifiedAt) {
    throw new ApplyError("This role is no longer open", "role_unavailable");
  }

  const existing = await db.query.application.findFirst({
    where: and(eq(application.jobId, input.jobId), eq(application.userId, userId)),
  });

  if (existing) {
    throw new ApplyError("You have already applied to this role", "already_applied");
  }

  const profile = await db.query.candidateProfile.findFirst({
    where: eq(candidateProfile.userId, userId),
  });

  const eligibility = checkEligibility(
    toCandidateConstraints(profile!),
    toRoleConstraints(roleRow, companyRow.stage),
  );

  if (!eligibility.allowed) {
    throw new ApplyError(eligibility.reasons[0], "not_eligible", eligibility);
  }

  const windowStart = currentQuotaWindow(now);
  const quotaBefore = await getQuota(db, userId, now);

  const applicationId = newId();
  const slaDueAt = computeSlaDueAt(now, companyRow.slaResponseDays ?? 7);

  await db.transaction(async (tx) => {
    const claimed = await claimQuotaSlot(tx, userId, windowStart, quotaBefore.limit);

    if (!claimed) {
      throw new ApplyError(
        `You have used all ${quotaBefore.limit} applications this week`,
        "quota_exhausted",
      );
    }

    await tx.insert(application).values({
      id: applicationId,
      jobId: input.jobId,
      userId,
      coverLetter: input.coverLetter?.trim() || null,
      appliedAt: now,
      slaDueAt,
      // Inherits the role's hiring manager, so the obligation has a name on it
      // from the moment it exists (§6.6).
      assigneeMemberId: roleRow.hiringManagerMemberId,
    });

    await tx.insert(applicationEvent).values({
      id: newId(),
      applicationId,
      kind: "submitted",
      actorUserId: userId,
      isCandidateVisible: false,
      occurredAt: now,
    });
  });

  return { applicationId, slaDueAt, quota: await getQuota(db, userId, now) };
};

/**
 * Withdraws an application.
 *
 * Releases the company from its obligation rather than counting against it:
 * blaming a company for someone else changing their mind would make the
 * published response rate dishonest in the other direction (§6.6).
 */
export const withdrawApplication = async (
  db: Database,
  userId: string,
  applicationId: string,
): Promise<void> => {
  const existing = await db.query.application.findFirst({
    where: and(eq(application.id, applicationId), eq(application.userId, userId)),
  });

  if (!existing) {
    throw new ApplyError("Application not found", "role_unavailable");
  }

  await db.transaction(async (tx) => {
    await tx.insert(applicationEvent).values({
      id: newId(),
      applicationId,
      kind: "candidate_withdrew",
      actorUserId: userId,
      isCandidateVisible: true,
      occurredAt: new Date(),
    });

    await tx
      .update(application)
      .set({ status: "withdrawn", slaState: "cancelled" })
      .where(eq(application.id, applicationId));
  });
};

/** The candidate's own applications, with what each company owes them. */
export const listMyApplications = async (db: Database, userId: string) =>
  db
    .select({
      id: application.id,
      jobId: application.jobId,
      jobTitle: job.title,
      companyName: company.name,
      companySlug: company.slug,
      status: application.status,
      appliedAt: application.appliedAt,
      slaDueAt: application.slaDueAt,
      slaState: application.slaState,
      firstResponseAt: application.firstResponseAt,
    })
    .from(application)
    .innerJoin(job, eq(job.id, application.jobId))
    .innerJoin(company, eq(company.id, job.companyId))
    .where(eq(application.userId, userId))
    .orderBy(desc(application.appliedAt));

/** What the candidate has been told, in order. */
export const getMyApplicationThread = async (
  db: Database,
  userId: string,
  applicationId: string,
) => {
  const app = await db.query.application.findFirst({
    where: and(eq(application.id, applicationId), eq(application.userId, userId)),
  });

  if (!app) {
    throw new ApplyError("Application not found", "role_unavailable");
  }

  // Only candidate-visible events: internal notes and triage are the company's
  // business, and showing them would imply the candidate had been told.
  const events = await db
    .select({
      id: applicationEvent.id,
      kind: applicationEvent.kind,
      body: applicationEvent.body,
      occurredAt: applicationEvent.occurredAt,
    })
    .from(applicationEvent)
    .where(
      and(
        eq(applicationEvent.applicationId, applicationId),
        eq(applicationEvent.isCandidateVisible, true),
      ),
    )
    .orderBy(asc(applicationEvent.occurredAt));

  return { application: app, events };
};

export const toggleSavedJob = async (
  db: Database,
  userId: string,
  jobId: string,
): Promise<{ saved: boolean }> => {
  const existing = await db.query.savedJob.findFirst({
    where: and(eq(savedJob.userId, userId), eq(savedJob.jobId, jobId)),
  });

  if (existing) {
    await db
      .delete(savedJob)
      .where(and(eq(savedJob.userId, userId), eq(savedJob.jobId, jobId)));
    return { saved: false };
  }

  await db.insert(savedJob).values({ userId, jobId });
  return { saved: true };
};
