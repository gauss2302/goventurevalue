import { and, asc, eq, gt, lte } from "drizzle-orm";

import type { Database } from "@/db/index";
import { application, company, job, moderationItem, slaWarning } from "@/db/schema";
import {
  SLA_ESCALATION_LEAD_HOURS,
  SLA_MAX_WARNINGS,
  SLA_REMINDER_LEAD_DAYS,
} from "@/config/brand";
import { recomputeSla, refreshCompanyResponseStats } from "@/lib/application/service";
import {
  canIssueWarningNow,
  currentWarningLevel,
  sanctionsForLevel,
  shouldIssueWarning,
  warningWindowStart,
} from "@/lib/company/slaPolicy";
import {
  escalationRecipients,
  recordNotification,
  recordNotifications,
  resolveReplyRecipients,
} from "@/lib/notify/service";

/**
 * The SLA sweep (docs/PRODUCT_PLAN.md §3.2, §5.4, §6.7).
 *
 * Split into *finding* work and *doing* work, and the split is load-bearing:
 *
 *   - the cron runs the finders, which are bounded queries, and enqueues one
 *     message per item. Its runtime does not depend on how much work there is, so
 *     it cannot one day fail to finish and silently drop the tail.
 *   - the queue consumer runs the handlers, one item at a time, with retries.
 *
 * Every handler re-reads state and re-checks its own precondition before acting,
 * because between enqueue and delivery the world moves: a company may have
 * replied in the meantime, and "you owe this candidate a reply" arriving ten
 * minutes after they sent one is how a system loses the benefit of the doubt.
 *
 * The handlers take a `Database` rather than living inside the Worker, so they
 * are testable against a real Postgres without a Worker runtime — the same shape
 * as every other service here.
 */

const newId = () => crypto.randomUUID();

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

// ---------------------------------------------------------------------------
// The queue contract
// ---------------------------------------------------------------------------

export type ReminderStage = "due_soon" | "escalate";

export type TaskMessage =
  | { kind: "sla.remind"; applicationId: string; stage: ReminderStage }
  | { kind: "sla.breach"; applicationId: string }
  | { kind: "company.review"; companyId: string };

/**
 * Messages carry identifiers and nothing else.
 *
 * No snapshots of state: by the time a message is delivered its payload would be
 * a claim about the past, and the handler would have to choose between acting on
 * stale data and ignoring the payload it was given. Identifiers force it to read
 * the present.
 */
export const isTaskMessage = (value: unknown): value is TaskMessage => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const message = value as Record<string, unknown>;

  switch (message.kind) {
    case "sla.remind":
      return (
        typeof message.applicationId === "string" &&
        (message.stage === "due_soon" || message.stage === "escalate")
      );
    case "sla.breach":
      return typeof message.applicationId === "string";
    case "company.review":
      return typeof message.companyId === "string";
    default:
      return false;
  }
};

/**
 * Which reminder, if any, an approaching deadline has earned.
 *
 * Pure, so the boundaries are testable without a clock or a database.
 */
export const classifyDeadline = (
  slaDueAt: Date,
  now: Date,
): ReminderStage | "overdue" | "not_yet" => {
  const remainingMs = slaDueAt.getTime() - now.getTime();

  if (remainingMs <= 0) {
    return "overdue";
  }
  if (remainingMs <= SLA_ESCALATION_LEAD_HOURS * MS_PER_HOUR) {
    return "escalate";
  }
  if (remainingMs <= SLA_REMINDER_LEAD_DAYS * MS_PER_DAY) {
    return "due_soon";
  }
  return "not_yet";
};

// ---------------------------------------------------------------------------
// Finding work
// ---------------------------------------------------------------------------

/**
 * Applications whose deadline is close but has not passed.
 *
 * Served by the (sla_state, sla_due_at) index, and bounded — a sweep that would
 * find more than `limit` items reports the overflow rather than pretending it
 * covered everything.
 */
export const findApproachingDeadlines = async (
  db: Database,
  now: Date = new Date(),
  limit = 500,
): Promise<Array<{ applicationId: string; stage: ReminderStage }>> => {
  const rows = await db
    .select({ id: application.id, slaDueAt: application.slaDueAt })
    .from(application)
    .where(
      and(
        eq(application.slaState, "pending"),
        gt(application.slaDueAt, now),
        lte(application.slaDueAt, new Date(now.getTime() + SLA_REMINDER_LEAD_DAYS * MS_PER_DAY)),
      ),
    )
    .orderBy(asc(application.slaDueAt))
    .limit(limit);

  return rows.flatMap((row) => {
    const stage = classifyDeadline(row.slaDueAt, now);
    return stage === "due_soon" || stage === "escalate"
      ? [{ applicationId: row.id, stage }]
      : [];
  });
};

/** Applications whose deadline has passed while still marked pending. */
export const findPassedDeadlines = async (
  db: Database,
  now: Date = new Date(),
  limit = 500,
): Promise<string[]> => {
  const rows = await db
    .select({ id: application.id })
    .from(application)
    .where(and(eq(application.slaState, "pending"), lte(application.slaDueAt, now)))
    .orderBy(asc(application.slaDueAt))
    .limit(limit);

  return rows.map((row) => row.id);
};

/**
 * Companies whose published figures or warning level may have moved.
 *
 * Driven by breaches recorded since the last look rather than by every company,
 * so the sweep's cost tracks the number of companies with something wrong.
 */
export const findCompaniesToReview = async (
  db: Database,
  since: Date,
  limit = 200,
): Promise<string[]> => {
  const rows = await db
    .selectDistinct({ companyId: job.companyId })
    .from(application)
    .innerJoin(job, eq(job.id, application.jobId))
    .where(and(eq(application.slaState, "breached"), gt(application.breachedAt, since)))
    .limit(limit);

  return rows.map((row) => row.companyId);
};

/**
 * Companies already on the ladder.
 *
 * Reviewed every sweep regardless of new breaches, because two things have to
 * keep happening without one: the next owed rung becomes issuable once a window
 * of real time has passed, and old warnings decay out of the level. Without this
 * a company that stopped breaching would keep its mark for ever, and one with
 * owed weeks would never reach the next rung.
 *
 * Bounded by definition — this is only companies currently in trouble.
 */
export const findCompaniesUnderWarning = async (
  db: Database,
  limit = 200,
): Promise<string[]> => {
  const rows = await db
    .select({ id: company.id })
    .from(company)
    .where(gt(company.slaWarningLevel, 0))
    .limit(limit);

  return rows.map((row) => row.id);
};

export type SweepPlan = {
  messages: TaskMessage[];
  /** Set when a finder hit its limit, so a truncated sweep is visible. */
  truncated: string[];
};

/**
 * Everything this run of the cron intends to do.
 *
 * Returned rather than executed so the cron can log it, and so a test can assert
 * what a given state of the database produces without any queue at all.
 */
export const planSweep = async (
  db: Database,
  now: Date = new Date(),
  limit = 500,
): Promise<SweepPlan> => {
  const [approaching, passed] = await Promise.all([
    findApproachingDeadlines(db, now, limit),
    findPassedDeadlines(db, now, limit),
  ]);

  // Anything that breached in the last day — which covers an hourly cadence plus
  // a few missed runs — plus everyone already on the ladder, so it keeps moving
  // and decaying without needing a fresh breach to nudge it.
  const [recent, onLadder] = await Promise.all([
    findCompaniesToReview(db, new Date(now.getTime() - MS_PER_DAY)),
    findCompaniesUnderWarning(db),
  ]);
  const companies = [...new Set([...recent, ...onLadder])];

  const messages: TaskMessage[] = [
    ...approaching.map(
      (item): TaskMessage => ({
        kind: "sla.remind",
        applicationId: item.applicationId,
        stage: item.stage,
      }),
    ),
    ...passed.map((applicationId): TaskMessage => ({ kind: "sla.breach", applicationId })),
    ...companies.map((companyId): TaskMessage => ({ kind: "company.review", companyId })),
  ];

  const truncated: string[] = [];
  if (approaching.length >= limit) {
    truncated.push(`approaching deadlines capped at ${limit}`);
  }
  if (passed.length >= limit) {
    truncated.push(`passed deadlines capped at ${limit}`);
  }

  return { messages, truncated };
};

// ---------------------------------------------------------------------------
// Doing work
// ---------------------------------------------------------------------------

export type HandlerOutcome =
  | { status: "done"; created: number; follow?: TaskMessage[] }
  /** The precondition no longer holds. Not an error — the world moved. */
  | { status: "stale"; reason: string };

const loadApplication = (db: Database, applicationId: string) =>
  db
    .select({
      id: application.id,
      userId: application.userId,
      status: application.status,
      slaState: application.slaState,
      slaDueAt: application.slaDueAt,
      remindedAt: application.remindedAt,
      assigneeMemberId: application.assigneeMemberId,
      jobTitle: job.title,
      companyId: job.companyId,
      companyName: company.name,
      hiringManagerMemberId: job.hiringManagerMemberId,
    })
    .from(application)
    .innerJoin(job, eq(job.id, application.jobId))
    .innerJoin(company, eq(company.id, job.companyId))
    .where(eq(application.id, applicationId))
    .limit(1);

/**
 * Reminds whoever owes a reply that the deadline is coming.
 *
 * `due_soon` goes to the one accountable person; `escalate` goes to the SLA
 * contact and the owners, because by then the accountable person has had two days
 * and the people who can reassign it need to know.
 */
export const handleReminder = async (
  db: Database,
  message: { applicationId: string; stage: ReminderStage },
  now: Date = new Date(),
): Promise<HandlerOutcome> => {
  const rows = await loadApplication(db, message.applicationId);

  if (rows.length === 0) {
    return { status: "stale", reason: "application no longer exists" };
  }

  const app = rows[0];

  if (app.slaState !== "pending") {
    // Answered, withdrawn or already breached since this was queued.
    return { status: "stale", reason: `sla state is ${app.slaState}` };
  }

  const stage = classifyDeadline(app.slaDueAt, now);
  if (stage !== message.stage) {
    // The clock moved past this stage while the message waited.
    return { status: "stale", reason: `deadline is now ${stage}` };
  }

  const recipients =
    message.stage === "escalate"
      ? await escalationRecipients(db, app.companyId)
      : await resolveReplyRecipients(db, {
          companyId: app.companyId,
          assigneeMemberId: app.assigneeMemberId,
          hiringManagerMemberId: app.hiringManagerMemberId,
        });

  if (recipients.length === 0) {
    // Nobody is accountable. Worth surfacing rather than swallowing: an
    // application with no owner is one nobody will answer.
    return { status: "stale", reason: "no active member to notify" };
  }

  const hoursLeft = Math.max(1, Math.round((app.slaDueAt.getTime() - now.getTime()) / MS_PER_HOUR));

  const created = await recordNotifications(db, recipients, (userId) => ({
    userId,
    kind: message.stage === "escalate" ? "reply_overdue" : "reply_due_soon",
    dedupeKey: `${message.stage}:${app.id}:${userId}`,
    title:
      message.stage === "escalate"
        ? `${hoursLeft}h left to reply about ${app.jobTitle}`
        : `A reply is due in ${Math.round(hoursLeft / 24)} days: ${app.jobTitle}`,
    body:
      message.stage === "escalate"
        ? "This is the last reminder before it counts as a missed deadline on your public record."
        : "A rejection counts as a reply. Silence does not.",
    href: `/company/${app.companyId}/applications/${app.id}`,
    applicationId: app.id,
    companyId: app.companyId,
    occurredAt: now,
  }));

  if (app.remindedAt === null) {
    await db
      .update(application)
      .set({ remindedAt: now })
      .where(eq(application.id, app.id));
  }

  return { status: "done", created };
};

/**
 * Records a passed deadline.
 *
 * The state is re-derived rather than assumed: the reply may have landed in the
 * minutes since the cron looked, and writing `breached` over an `answered`
 * application would put a false accusation into the number we publish.
 */
export const handleBreach = async (
  db: Database,
  message: { applicationId: string },
  now: Date = new Date(),
): Promise<HandlerOutcome> => {
  const rows = await loadApplication(db, message.applicationId);

  if (rows.length === 0) {
    return { status: "stale", reason: "application no longer exists" };
  }

  const app = rows[0];
  const { slaState } = await recomputeSla(db, app.id);

  if (slaState !== "breached") {
    return { status: "stale", reason: `sla state re-derived as ${slaState}` };
  }

  let created = 0;

  // The candidate hears it from us, because it is our measurement. Told plainly,
  // including that they do not need to chase it.
  const candidate = await recordNotification(db, {
    userId: app.userId,
    kind: "reply_deadline_missed",
    dedupeKey: `breach:${app.id}`,
    title: `${app.companyName} missed their reply deadline`,
    body:
      `They committed to replying about ${app.jobTitle} and have not. ` +
      "It counts against the response rate shown on their roles. You do not need to chase them.",
    href: `/applications/${app.id}`,
    applicationId: app.id,
    companyId: app.companyId,
    occurredAt: now,
  });
  created += candidate.created ? 1 : 0;

  created += await recordNotifications(
    db,
    await escalationRecipients(db, app.companyId),
    (userId) => ({
      userId,
      kind: "reply_overdue",
      dedupeKey: `breached:${app.id}:${userId}`,
      title: `Missed deadline: ${app.jobTitle}`,
      body: "This is now on your public record. Replying late is still better than not replying.",
      href: `/company/${app.companyId}/applications/${app.id}`,
      applicationId: app.id,
      companyId: app.companyId,
      occurredAt: now,
    }),
  );

  return {
    status: "done",
    created,
    follow: [{ kind: "company.review", companyId: app.companyId }],
  };
};

// ---------------------------------------------------------------------------
// The warning ladder
// ---------------------------------------------------------------------------

/**
 * Windows that earned a warning and have not been given one.
 *
 * Oldest first, and the caller issues **at most one per run**. After an outage a
 * company might have three unwarned weeks on the books; issuing them together
 * would take it from untouched to suspended in a single sweep, for weeks it was
 * never told about. The ladder only means something if each rung arrives with a
 * chance to react.
 */
export const pendingWarningWindows = (
  breachedAt: readonly Date[],
  issuedWindows: ReadonlySet<string>,
): Array<{ windowStart: string; breachCount: number }> => {
  const counts = new Map<string, number>();

  for (const at of breachedAt) {
    const window = warningWindowStart(at);
    counts.set(window, (counts.get(window) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([windowStart, breachCount]) =>
      shouldIssueWarning({
        breachesInWindow: breachCount,
        alreadyIssuedForWindow: issuedWindows.has(windowStart),
      }),
    )
    .map(([windowStart, breachCount]) => ({ windowStart, breachCount }))
    .sort((a, b) => a.windowStart.localeCompare(b.windowStart));
};

/**
 * Refreshes a company's published figures and advances the ladder if a week
 * earned it.
 *
 * Idempotent on both counts: the figures are recomputed from scratch, and a
 * warning is inserted against a unique (company, window) so a replayed message
 * cannot double-punish.
 */
export const handleCompanyReview = async (
  db: Database,
  message: { companyId: string },
  now: Date = new Date(),
): Promise<HandlerOutcome> => {
  const companies = await db
    .select({
      id: company.id,
      name: company.name,
      lifecycle: company.lifecycle,
      slaWarningLevel: company.slaWarningLevel,
      slaMarkedAt: company.slaMarkedAt,
      suspendedForSlaAt: company.suspendedForSlaAt,
    })
    .from(company)
    .where(eq(company.id, message.companyId))
    .limit(1);

  if (companies.length === 0) {
    return { status: "stale", reason: "company no longer exists" };
  }

  const target = companies[0];

  await refreshCompanyResponseStats(db, target.id);

  const breaches = await db
    .select({ breachedAt: application.breachedAt })
    .from(application)
    .innerJoin(job, eq(job.id, application.jobId))
    .where(and(eq(job.companyId, target.id), eq(application.slaState, "breached")));

  const existing = await db
    .select({ windowStart: slaWarning.windowStart, issuedAt: slaWarning.issuedAt })
    .from(slaWarning)
    .where(eq(slaWarning.companyId, target.id));

  const pending = pendingWarningWindows(
    breaches
      .map((row) => row.breachedAt)
      .filter((value): value is Date => value !== null),
    new Set(existing.map((row) => row.windowStart)),
  );

  let created = 0;
  let warnings = existing.map((row) => ({
    windowStart: row.windowStart,
    issuedAt: row.issuedAt,
  }));

  const lastIssuedAt = warnings.reduce<Date | null>(
    (latest, warning) =>
      latest === null || warning.issuedAt > latest ? warning.issuedAt : latest,
    null,
  );

  // Oldest owed week first, and only if a window has passed since the last
  // warning — see canIssueWarningNow. Without the spacing check an hourly cron
  // would issue every owed week within hours of catching up.
  const next = canIssueWarningNow({ lastIssuedAt, now }) ? pending[0] : undefined;

  if (next) {
    const levelAtIssue = currentWarningLevel(warnings, now) + 1;

    const inserted = await db
      .insert(slaWarning)
      .values({
        id: newId(),
        companyId: target.id,
        windowStart: next.windowStart,
        level: levelAtIssue,
        breachCount: next.breachCount,
        issuedAt: now,
      })
      .onConflictDoNothing({ target: [slaWarning.companyId, slaWarning.windowStart] })
      .returning({ id: slaWarning.id });

    if (inserted.length > 0) {
      warnings = [...warnings, { windowStart: next.windowStart, issuedAt: now }];

      const sanctions = sanctionsForLevel(levelAtIssue);

      created += await recordNotifications(
        db,
        await escalationRecipients(db, target.id),
        (userId) => ({
          userId,
          kind: sanctions.suspended ? "company_suspended" : "sla_warning",
          dedupeKey: `warning:${target.id}:${next.windowStart}:${userId}`,
          title: sanctions.suspended
            ? "Your roles have been taken down"
            : `Warning ${levelAtIssue} of ${SLA_MAX_WARNINGS}: unanswered applicants`,
          body: sanctions.suspended
            ? "Four warnings for missing reply deadlines. Your roles are unlisted until this is resolved with us."
            : sanctions.publishBlocked
              ? `${next.breachCount} applicant(s) went unanswered in the week of ${next.windowStart}. You cannot publish new roles until you have answered the ones you have.`
              : sanctions.publicMark
                ? `${next.breachCount} applicant(s) went unanswered in the week of ${next.windowStart}. Candidates can now see that you have missed deadlines.`
                : `${next.breachCount} applicant(s) went unanswered in the week of ${next.windowStart}. Nothing is public yet.`,
          href: `/company/${target.id}`,
          companyId: target.id,
          occurredAt: now,
        }),
      );
    }
  }

  const level = currentWarningLevel(warnings, now);
  const sanctions = sanctionsForLevel(level);

  await db
    .update(company)
    .set({
      slaWarningLevel: level,
      // Stamped when the mark goes up and kept stable afterwards, so the public
      // page can say since when. Cleared when warnings decay below the
      // threshold: a company that recovered should stop carrying the label.
      slaMarkedAt: sanctions.publicMark ? (target.slaMarkedAt ?? now) : null,
      // Suspension is applied automatically; lifting it is not. A suspended
      // company comes back through a curator (§0), so nothing here ever moves
      // the lifecycle out of `suspended`.
      ...(sanctions.suspended
        ? {
            lifecycle: "suspended" as const,
            suspendedForSlaAt: target.suspendedForSlaAt ?? now,
          }
        : {}),
    })
    .where(eq(company.id, target.id));

  if (sanctions.suspended) {
    await suspendCompanyRoles(db, target.id, now);
  }

  return { status: "done", created };
};

/**
 * Takes a suspended company's roles off the board and asks a human to look.
 *
 * Archiving is automatic because every hour a role stays up is another candidate
 * spending one of eight applications on a company that will not answer. Removing
 * the company is not automatic — that is a curator's decision (§0), and the
 * moderation item is how it reaches them.
 */
const suspendCompanyRoles = async (
  db: Database,
  companyId: string,
  now: Date,
): Promise<void> => {
  const affected = await db
    .update(job)
    .set({ status: "archived", archivedAt: now })
    .where(and(eq(job.companyId, companyId), eq(job.status, "published")))
    .returning({ id: job.id });

  // One open item per company, not one per sweep. `moderation_item` has no
  // natural key to conflict on, so the check is explicit — an hourly cron would
  // otherwise bury the curator's queue under the same company.
  const open = await db
    .select({ id: moderationItem.id })
    .from(moderationItem)
    .where(
      and(
        eq(moderationItem.companyId, companyId),
        eq(moderationItem.kind, "sla_breach"),
        eq(moderationItem.state, "open"),
      ),
    )
    .limit(1);

  if (open.length > 0) {
    return;
  }

  await db.insert(moderationItem).values({
    id: newId(),
    kind: "sla_breach",
    companyId,
    payload: { rolesArchived: affected.length, suspendedAt: now.toISOString() },
    // Above a new-company review: people are being ignored right now.
    priority: 90,
  });
};

/** Applications a member still owes a reply on, newest deadline last. */
export const outstandingForMember = (
  db: Database,
  memberId: string,
  limit = 50,
) =>
  db
    .select({
      id: application.id,
      jobTitle: job.title,
      slaDueAt: application.slaDueAt,
    })
    .from(application)
    .innerJoin(job, eq(job.id, application.jobId))
    .where(
      and(
        eq(application.assigneeMemberId, memberId),
        eq(application.slaState, "pending"),
      ),
    )
    .orderBy(asc(application.slaDueAt))
    .limit(limit);
