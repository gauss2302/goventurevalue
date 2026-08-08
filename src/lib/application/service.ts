import { and, asc, eq, inArray, isNull, lte, ne, sql } from "drizzle-orm";

import type { Database } from "@/db/index";
import { application, applicationEvent, company, companyMember, job } from "@/db/schema";
import {
  ForbiddenError,
  NotFoundError,
  requireCapability,
  type Actor,
} from "@/lib/company/context";
import {
  countsAsCompanyResponse,
  deriveSlaVerdict,
  isCandidateVisibleKind,
  type ApplicationEventKind,
  type SlaState,
} from "@/lib/application/sla";
import type { applicationStatusEnum } from "@/db/schema";

/**
 * The applications inbox and the respond action (docs/PRODUCT_PLAN.md §3.2, §6.6).
 *
 * This is where the SLA logic stops being a library and starts governing data.
 * The invariant everything here protects: `application.first_response_at` and
 * `application.sla_state` must always agree with `application_event`, because the
 * publicly displayed response rate is derived from them. They are therefore only
 * ever written together, inside one transaction, from the event history.
 */

export type ApplicationStatus = (typeof applicationStatusEnum.enumValues)[number];

/**
 * A database handle or an open transaction.
 *
 * Derived from Drizzle's own signature rather than cast, so a mismatch surfaces
 * as a type error instead of being hidden behind `as unknown as`.
 */
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type DbOrTx = Database | Transaction;

const newId = () => crypto.randomUUID();

const loadApplicationWithCompany = async (db: Database, applicationId: string) => {
  const row = await db
    .select({
      id: application.id,
      jobId: application.jobId,
      userId: application.userId,
      status: application.status,
      appliedAt: application.appliedAt,
      slaDueAt: application.slaDueAt,
      slaState: application.slaState,
      firstResponseAt: application.firstResponseAt,
      assigneeMemberId: application.assigneeMemberId,
      companyId: job.companyId,
      hiringManagerMemberId: job.hiringManagerMemberId,
    })
    .from(application)
    .innerJoin(job, eq(job.id, application.jobId))
    .where(eq(application.id, applicationId))
    .limit(1);

  if (row.length === 0) {
    throw new NotFoundError(`Application ${applicationId} not found`);
  }

  return row[0];
};

/**
 * Recomputes SLA fields from the event history and persists them.
 *
 * Always derived, never incremented in place: an event inserted out of order, a
 * retried queue message or a backfill would otherwise leave the stored state
 * disagreeing with the events it claims to summarise — and that number is what
 * we publish about a company.
 */
const recomputeSla = async (
  tx: DbOrTx,
  applicationId: string,
): Promise<{ slaState: SlaState; firstResponseAt: Date | null }> => {
  const current = await tx
    .select({
      appliedAt: application.appliedAt,
      slaDueAt: application.slaDueAt,
    })
    .from(application)
    .where(eq(application.id, applicationId))
    .limit(1);

  if (current.length === 0) {
    throw new NotFoundError(`Application ${applicationId} not found`);
  }

  const events = await tx
    .select({ kind: applicationEvent.kind, occurredAt: applicationEvent.occurredAt })
    .from(applicationEvent)
    .where(eq(applicationEvent.applicationId, applicationId));

  const verdict = deriveSlaVerdict({
    appliedAt: current[0].appliedAt,
    slaDueAt: current[0].slaDueAt,
    events,
  });

  await tx
    .update(application)
    .set({
      firstResponseAt: verdict.firstResponseAt,
      slaState: verdict.state,
      breachedAt: verdict.state === "breached" ? new Date() : null,
    })
    .where(eq(application.id, applicationId));

  return { slaState: verdict.state, firstResponseAt: verdict.firstResponseAt };
};

export type RecordEventInput = {
  applicationId: string;
  kind: ApplicationEventKind;
  actorUserId?: string | null;
  actorMemberId?: string | null;
  body?: string | null;
  fromStatus?: ApplicationStatus | null;
  toStatus?: ApplicationStatus | null;
  occurredAt?: Date;
};

/**
 * Appends an event and re-derives the SLA in the same transaction.
 *
 * `isCandidateVisible` is computed from the kind rather than accepted from the
 * caller: it is the predicate the response promise rests on, so no call site
 * gets to decide it.
 */
export const recordApplicationEvent = async (
  db: Database,
  input: RecordEventInput,
): Promise<{ eventId: string; slaState: SlaState }> =>
  db.transaction(async (tx) => {
    const eventId = newId();

    await tx.insert(applicationEvent).values({
      id: eventId,
      applicationId: input.applicationId,
      kind: input.kind,
      actorUserId: input.actorUserId ?? null,
      actorMemberId: input.actorMemberId ?? null,
      isCandidateVisible: isCandidateVisibleKind(input.kind),
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      body: input.body ?? null,
      occurredAt: input.occurredAt ?? new Date(),
    });

    const { slaState } = await recomputeSla(tx, input.applicationId);

    return { eventId, slaState };
  });

export type RespondInput = {
  applicationId: string;
  body: string;
  /** A rejection or an offer is a decision; anything else is a message. */
  decision?: boolean;
  /** Optional status change applied alongside the reply. */
  toStatus?: ApplicationStatus;
};

/**
 * Replies to a candidate. The action the whole product exists to make happen.
 *
 * Available to `recruiter` and above deliberately (§6.6): an obligation only
 * admins can discharge is one that gets missed.
 */
export const respondToApplication = async (
  db: Database,
  actor: Actor,
  input: RespondInput,
): Promise<{ slaState: SlaState; respondedAt: Date }> => {
  const app = await loadApplicationWithCompany(db, input.applicationId);
  const membership = requireCapability(actor, app.companyId, "respondToApplication");

  const body = input.body.trim();
  if (body.length === 0) {
    // An empty reply would satisfy the SLA while telling the candidate nothing —
    // precisely the loophole the response definition exists to close.
    throw new Error("A reply must contain a message");
  }

  const respondedAt = new Date();
  const kind: ApplicationEventKind = input.decision ? "decision" : "message_to_candidate";

  const { slaState } = await db.transaction(async (tx) => {
    if (input.toStatus && input.toStatus !== app.status) {
      await tx
        .update(application)
        .set({ status: input.toStatus })
        .where(eq(application.id, input.applicationId));

      await tx.insert(applicationEvent).values({
        id: newId(),
        applicationId: input.applicationId,
        kind: "status_changed",
        actorUserId: actor.userId,
        actorMemberId: membership.memberId,
        isCandidateVisible: false,
        fromStatus: app.status,
        toStatus: input.toStatus,
        occurredAt: respondedAt,
      });
    }

    await tx.insert(applicationEvent).values({
      id: newId(),
      applicationId: input.applicationId,
      kind,
      actorUserId: actor.userId,
      actorMemberId: membership.memberId,
      isCandidateVisible: true,
      body,
      occurredAt: respondedAt,
    });

    return recomputeSla(tx, input.applicationId);
  });

  return { slaState, respondedAt };
};

/**
 * Changes an application's status without telling the candidate.
 *
 * Explicitly does not touch the SLA. Internal triage is real work, but the
 * candidate perceives nothing, so the clock keeps running (§6.6).
 */
export const changeApplicationStatus = async (
  db: Database,
  actor: Actor,
  input: { applicationId: string; toStatus: ApplicationStatus },
): Promise<void> => {
  const app = await loadApplicationWithCompany(db, input.applicationId);
  const membership = requireCapability(actor, app.companyId, "changeApplicationStatus");

  if (app.status === input.toStatus) {
    return;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(application)
      .set({ status: input.toStatus })
      .where(eq(application.id, input.applicationId));

    await tx.insert(applicationEvent).values({
      id: newId(),
      applicationId: input.applicationId,
      kind: "status_changed",
      actorUserId: actor.userId,
      actorMemberId: membership.memberId,
      isCandidateVisible: false,
      fromStatus: app.status,
      toStatus: input.toStatus,
      occurredAt: new Date(),
    });
  });
};

export const assignApplication = async (
  db: Database,
  actor: Actor,
  input: { applicationId: string; assigneeMemberId: string | null },
): Promise<void> => {
  const app = await loadApplicationWithCompany(db, input.applicationId);
  const membership = requireCapability(actor, app.companyId, "assignApplication");

  if (input.assigneeMemberId) {
    const target = await db.query.companyMember.findFirst({
      where: and(
        eq(companyMember.id, input.assigneeMemberId),
        eq(companyMember.companyId, app.companyId),
        isNull(companyMember.removedAt),
      ),
    });

    if (!target) {
      throw new ForbiddenError("Assignee must be an active member of this company");
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(application)
      .set({ assigneeMemberId: input.assigneeMemberId })
      .where(eq(application.id, input.applicationId));

    await tx.insert(applicationEvent).values({
      id: newId(),
      applicationId: input.applicationId,
      kind: "assigned",
      actorUserId: actor.userId,
      actorMemberId: membership.memberId,
      isCandidateVisible: false,
      body: input.assigneeMemberId,
      occurredAt: new Date(),
    });
  });
};

// ---------------------------------------------------------------------------
// Inbox
// ---------------------------------------------------------------------------

export type InboxFilter = {
  /** Only what this member owes a reply on. */
  assigneeMemberId?: string;
  jobId?: string;
  slaStates?: SlaState[];
  limit?: number;
};

/**
 * The company's incoming applications.
 *
 * Ordered by SLA deadline rather than arrival: the useful question is not "what
 * is newest" but "what runs out first". Answered items sort last.
 */
export const listInbox = async (
  db: Database,
  actor: Actor,
  companyId: string,
  filter: InboxFilter = {},
) => {
  requireCapability(actor, companyId, "viewApplications");

  const conditions = [eq(job.companyId, companyId)];

  if (filter.assigneeMemberId) {
    conditions.push(eq(application.assigneeMemberId, filter.assigneeMemberId));
  }
  if (filter.jobId) {
    conditions.push(eq(application.jobId, filter.jobId));
  }
  if (filter.slaStates && filter.slaStates.length > 0) {
    conditions.push(inArray(application.slaState, filter.slaStates));
  }

  return db
    .select({
      id: application.id,
      jobId: application.jobId,
      jobTitle: job.title,
      candidateUserId: application.userId,
      status: application.status,
      appliedAt: application.appliedAt,
      slaDueAt: application.slaDueAt,
      slaState: application.slaState,
      firstResponseAt: application.firstResponseAt,
      assigneeMemberId: application.assigneeMemberId,
    })
    .from(application)
    .innerJoin(job, eq(job.id, application.jobId))
    .where(and(...conditions))
    .orderBy(
      // Pending first, then by how soon the deadline bites.
      sql`case when ${application.slaState} = 'pending' then 0 else 1 end`,
      asc(application.slaDueAt),
    )
    .limit(filter.limit ?? 100);
};

export const getApplicationThread = async (
  db: Database,
  actor: Actor,
  applicationId: string,
) => {
  const app = await loadApplicationWithCompany(db, applicationId);
  requireCapability(actor, app.companyId, "viewApplications");

  const events = await db
    .select()
    .from(applicationEvent)
    .where(eq(applicationEvent.applicationId, applicationId))
    .orderBy(asc(applicationEvent.occurredAt));

  return { application: app, events };
};

// ---------------------------------------------------------------------------
// SLA sweep
// ---------------------------------------------------------------------------

/**
 * Applications whose deadline has passed without a reply.
 *
 * Read by the hourly cron (§5.4) to mark breaches and raise moderation items.
 * Uses the stored `sla_state` index rather than replaying events for every row —
 * the states are kept in sync by `recomputeSla`, so this is a cheap filter over
 * an authoritative column.
 */
export const findOverdueApplications = async (
  db: Database,
  now: Date = new Date(),
  limit = 500,
) =>
  db
    .select({
      id: application.id,
      jobId: application.jobId,
      companyId: job.companyId,
      assigneeMemberId: application.assigneeMemberId,
      hiringManagerMemberId: job.hiringManagerMemberId,
      slaDueAt: application.slaDueAt,
      remindedAt: application.remindedAt,
    })
    .from(application)
    .innerJoin(job, eq(job.id, application.jobId))
    .where(and(eq(application.slaState, "pending"), lte(application.slaDueAt, now)))
    .orderBy(asc(application.slaDueAt))
    .limit(limit);

/** Marks overdue applications as breached, deriving each from its events. */
export const markBreached = async (
  db: Database,
  applicationIds: string[],
): Promise<number> => {
  let breached = 0;

  for (const id of applicationIds) {
    const { slaState } = await recomputeSla(db, id);
    if (slaState === "breached") {
      breached += 1;
    }
  }

  return breached;
};

export { countsAsCompanyResponse };

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

/**
 * What a company owes right now, plus how it has been doing.
 *
 * `responseRate` is null rather than 0 when nothing is measurable — a company
 * with no resolved applications has no response rate, and "0%" would be a false
 * accusation (§6.4 rule 2).
 */
export const companySlaDashboard = async (
  db: Database,
  actor: Actor,
  companyId: string,
  now: Date = new Date(),
) => {
  requireCapability(actor, companyId, "viewApplications");

  const rows = await db
    .select({
      slaState: application.slaState,
      slaDueAt: application.slaDueAt,
      appliedAt: application.appliedAt,
      firstResponseAt: application.firstResponseAt,
    })
    .from(application)
    .innerJoin(job, eq(job.id, application.jobId))
    .where(eq(job.companyId, companyId));

  const pending = rows.filter((r) => r.slaState === "pending");
  const answered = rows.filter((r) => r.slaState === "answered").length;
  const breached = rows.filter((r) => r.slaState === "breached").length;
  const measured = answered + breached;

  const responseHours = rows
    .filter((r) => r.firstResponseAt !== null)
    .map((r) => (r.firstResponseAt!.getTime() - r.appliedAt.getTime()) / 3_600_000);

  const sorted = [...responseHours].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const medianResponseHours =
    sorted.length === 0
      ? null
      : sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle];

  return {
    awaitingReply: pending.length,
    dueWithin24h: pending.filter(
      (r) => r.slaDueAt.getTime() - now.getTime() <= 86_400_000,
    ).length,
    overdue: pending.filter((r) => r.slaDueAt.getTime() < now.getTime()).length,
    answered,
    breached,
    responseRate: measured === 0 ? null : answered / measured,
    medianResponseHours:
      medianResponseHours === null ? null : Math.round(medianResponseHours * 10) / 10,
  };
};

/**
 * Recomputes and stores a company's public response figures.
 *
 * Called by the hourly sweep. Writes null when unmeasurable, for the same reason
 * the dashboard reports null.
 */
export const refreshCompanyResponseStats = async (
  db: Database,
  companyId: string,
): Promise<void> => {
  const rows = await db
    .select({
      slaState: application.slaState,
      appliedAt: application.appliedAt,
      firstResponseAt: application.firstResponseAt,
    })
    .from(application)
    .innerJoin(job, eq(job.id, application.jobId))
    .where(and(eq(job.companyId, companyId), ne(application.slaState, "cancelled")));

  const measurable = rows.filter(
    (r) => r.slaState === "answered" || r.slaState === "breached",
  );
  const answered = measurable.filter((r) => r.slaState === "answered").length;

  const responseHours = rows
    .filter((r) => r.firstResponseAt !== null)
    .map((r) => (r.firstResponseAt!.getTime() - r.appliedAt.getTime()) / 3_600_000)
    .sort((a, b) => a - b);

  const middle = Math.floor(responseHours.length / 2);
  const median =
    responseHours.length === 0
      ? null
      : responseHours.length % 2 === 0
        ? (responseHours[middle - 1] + responseHours[middle]) / 2
        : responseHours[middle];

  await db
    .update(company)
    .set({
      responseRate30d:
        measurable.length === 0 ? null : (answered / measurable.length).toFixed(4),
      medianFirstResponseHours: median === null ? null : Math.round(median),
      slaBreachCount: measurable.length - answered,
    })
    .where(eq(company.id, companyId));
};
