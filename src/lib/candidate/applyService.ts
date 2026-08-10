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
import { recomputeSla } from "@/lib/application/service";
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
import { buildFlow, summariseFlow, type FlowSourceEvent } from "@/lib/candidate/flow";
import type { ResponseRecord } from "@/lib/company/publicProfile";

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
      | "role_unavailable"
      | "thread_closed",
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
 * Releases the company from an obligation it has not yet discharged rather than
 * counting against it: blaming a company for someone else changing their mind
 * would make the published response rate dishonest in the other direction
 * (§6.6).
 *
 * The SLA state is re-derived from the events rather than set to `cancelled`
 * outright, because a withdrawal after a reply must not erase the reply. A
 * company that answered in two days and then had the candidate withdraw earned
 * that answer, and hard-writing `cancelled` here would quietly delete it from
 * the rate we publish about them.
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
      .set({ status: "withdrawn" })
      .where(eq(application.id, applicationId));

    await recomputeSla(tx, applicationId);
  });
};

// ---------------------------------------------------------------------------
// The flow: what happened to an application after it was sent
// ---------------------------------------------------------------------------

/**
 * Loads the events a candidate is entitled to see.
 *
 * Filtered on the stored `is_candidate_visible` column, which is written from the
 * event kind and never from a caller (see recordApplicationEvent). `buildFlow`
 * filters again on the way out — this is the seam where a company's internal
 * notes would become someone else's reading material, so it does not rest on one
 * check.
 */
type CandidateVisibleEvent = FlowSourceEvent & { applicationId: string };

const loadCandidateVisibleEvents = (
  db: Database,
  applicationIds: string[],
): Promise<CandidateVisibleEvent[]> =>
  applicationIds.length === 0
    ? Promise.resolve([])
    : db
        .select({
          id: applicationEvent.id,
          applicationId: applicationEvent.applicationId,
          kind: applicationEvent.kind,
          body: applicationEvent.body,
          fromStatus: applicationEvent.fromStatus,
          toStatus: applicationEvent.toStatus,
          occurredAt: applicationEvent.occurredAt,
        })
        .from(applicationEvent)
        .where(
          and(
            inArray(applicationEvent.applicationId, applicationIds),
            eq(applicationEvent.isCandidateVisible, true),
          ),
        )
        .orderBy(asc(applicationEvent.occurredAt));

/**
 * The candidate's own applications, each summarised the same way the detail
 * screen derives it.
 *
 * Two queries rather than one per row: the events are fetched in a single
 * `IN (...)` and grouped in memory, because a tracker with twenty applications
 * on a Worker cannot afford twenty round trips through Hyperdrive.
 */
export const listMyApplications = async (
  db: Database,
  userId: string,
  now: Date = new Date(),
) => {
  const rows = await db
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
      candidateLastSeenAt: application.candidateLastSeenAt,
    })
    .from(application)
    .innerJoin(job, eq(job.id, application.jobId))
    .innerJoin(company, eq(company.id, job.companyId))
    .where(eq(application.userId, userId))
    .orderBy(desc(application.appliedAt));

  const events = await loadCandidateVisibleEvents(
    db,
    rows.map((row) => row.id),
  );

  const byApplication = new Map<string, FlowSourceEvent[]>();
  for (const item of events) {
    const bucket = byApplication.get(item.applicationId);
    if (bucket) {
      bucket.push(item);
    } else {
      byApplication.set(item.applicationId, [item]);
    }
  }

  // Built explicitly rather than spread. The row carries `status`, the company's
  // internal stage, and spreading it would ship that to the candidate's browser
  // even though nothing renders it — a leak in the payload is still a leak. The
  // stage the candidate may see comes from the derivation instead.
  return rows.map((row) => ({
    id: row.id,
    jobId: row.jobId,
    jobTitle: row.jobTitle,
    companyName: row.companyName,
    companySlug: row.companySlug,
    appliedAt: row.appliedAt,
    slaDueAt: row.slaDueAt,
    firstResponseAt: row.firstResponseAt,
    ...summariseFlow({
      companyName: row.companyName,
      appliedAt: row.appliedAt,
      slaDueAt: row.slaDueAt,
      slaState: row.slaState,
      candidateLastSeenAt: row.candidateLastSeenAt,
      events: byApplication.get(row.id) ?? [],
      now,
    }),
  }));
};

/**
 * One application, in full: the stage, the timeline, and where the promise
 * stands.
 *
 * The company's public response record travels with it deliberately. A candidate
 * reading "no reply yet, four days left" deserves the context of whether this
 * company usually answers — and that number is measured, not claimed (§6.4).
 */
export const getMyApplicationFlow = async (
  db: Database,
  userId: string,
  applicationId: string,
  now: Date = new Date(),
) => {
  const rows = await db
    .select({
      application,
      job: {
        id: job.id,
        title: job.title,
        roleFamily: job.roleFamily,
        seniority: job.seniority,
        remoteType: job.remoteType,
      },
      company: {
        name: company.name,
        slug: company.slug,
        stage: company.stage,
        slaResponseDays: company.slaResponseDays,
        responseRate30d: company.responseRate30d,
        medianFirstResponseHours: company.medianFirstResponseHours,
      },
    })
    .from(application)
    .innerJoin(job, eq(job.id, application.jobId))
    .innerJoin(company, eq(company.id, job.companyId))
    .where(and(eq(application.id, applicationId), eq(application.userId, userId)))
    .limit(1);

  if (rows.length === 0) {
    // Indistinguishable from someone else's application on purpose.
    throw new ApplyError("Application not found", "role_unavailable");
  }

  const { application: app, job: role, company: companyRow } = rows[0];
  const events = await loadCandidateVisibleEvents(db, [app.id]);

  const flow = buildFlow({
    companyName: companyRow.name,
    appliedAt: app.appliedAt,
    slaDueAt: app.slaDueAt,
    slaState: app.slaState,
    candidateLastSeenAt: app.candidateLastSeenAt,
    events,
    now,
  });

  return {
    applicationId: app.id,
    coverLetter: app.coverLetter,
    role,
    company: { name: companyRow.name, slug: companyRow.slug, stage: companyRow.stage },
    // Same shape the public role page uses, so the record a candidate saw before
    // applying is the record they see afterwards.
    responseRecord: {
      responseRate:
        companyRow.responseRate30d === null ? null : Number(companyRow.responseRate30d),
      medianFirstResponseHours: companyRow.medianFirstResponseHours,
      slaResponseDays: companyRow.slaResponseDays,
    } satisfies ResponseRecord,
    flow,
  };
};

/**
 * The candidate writes back.
 *
 * Gated on the company having written first (`flow.canMessage`), for two
 * reasons: an unopened thread has nobody reading it, and an open one would be a
 * way around the weekly cap (§3.2). Recorded as `candidate_message`, which never
 * counts as the company's response — being answered is the company's act, and
 * letting a candidate's own message touch the promise would corrupt the number we
 * publish about companies.
 */
export const sendCandidateMessage = async (
  db: Database,
  userId: string,
  input: { applicationId: string; body: string },
  now: Date = new Date(),
): Promise<{ eventId: string }> => {
  const body = input.body.trim();

  if (body.length === 0) {
    throw new ApplyError("A message cannot be empty", "thread_closed");
  }

  const { flow } = await getMyApplicationFlow(db, userId, input.applicationId, now);

  if (!flow.canMessage) {
    throw new ApplyError(
      flow.outcome.kind === "withdrawn"
        ? "You withdrew this application, so the thread is closed"
        : "You can write back once they have replied to you",
      "thread_closed",
    );
  }

  const eventId = newId();

  await db.insert(applicationEvent).values({
    id: eventId,
    applicationId: input.applicationId,
    kind: "candidate_message",
    actorUserId: userId,
    isCandidateVisible: true,
    body,
    occurredAt: now,
  });

  return { eventId };
};

/**
 * Records that the candidate has read the flow.
 *
 * Deliberately a separate write rather than a side effect of reading it, so the
 * detail screen can still highlight what was new at the moment it was opened.
 */
export const markApplicationSeen = async (
  db: Database,
  userId: string,
  applicationId: string,
  now: Date = new Date(),
): Promise<void> => {
  await db
    .update(application)
    .set({ candidateLastSeenAt: now })
    .where(and(eq(application.id, applicationId), eq(application.userId, userId)));
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
