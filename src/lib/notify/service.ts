import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import type { Database } from "@/db/index";
import {
  companyMember,
  notification,
  type notificationKindEnum,
} from "@/db/schema";

/**
 * Notifications (docs/PRODUCT_PLAN.md §3.2).
 *
 * Every notification is written through `recordNotification`, which is
 * idempotent on a natural key. That is not defensive tidiness: Cloudflare Queues
 * deliver at least once, so any consumer that writes without a dedupe key will
 * eventually tell somebody the same thing twice, and the first time it happens in
 * production it will be an email.
 *
 * The rule for what gets a notification at all: a fact changed. There is no
 * "still waiting" notification — the deadline was known on the day of the
 * application, and repeating it would train people to ignore the ones that
 * matter.
 */

export type NotificationKind = (typeof notificationKindEnum.enumValues)[number];

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type DbOrTx = Database | Transaction;

const newId = () => crypto.randomUUID();

export type NotificationInput = {
  userId: string;
  kind: NotificationKind;
  /**
   * Natural key for this exact notification, composed from the facts it
   * describes — `replied:{eventId}`, `breach:{applicationId}`. Never a timestamp
   * or a random value: the whole point is that the same fact yields the same key.
   */
  dedupeKey: string;
  title: string;
  body?: string | null;
  href?: string | null;
  applicationId?: string | null;
  companyId?: string | null;
  occurredAt?: Date;
};

/**
 * Records a notification, once.
 *
 * Returns whether this call is the one that created it. Only the winner should
 * go on to send anything — that is how a replayed queue message stays silent.
 */
export const recordNotification = async (
  tx: DbOrTx,
  input: NotificationInput,
): Promise<{ created: boolean; id: string | null }> => {
  const rows = await tx
    .insert(notification)
    .values({
      id: newId(),
      userId: input.userId,
      kind: input.kind,
      dedupeKey: input.dedupeKey,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      applicationId: input.applicationId ?? null,
      companyId: input.companyId ?? null,
      createdAt: input.occurredAt ?? new Date(),
    })
    .onConflictDoNothing({ target: notification.dedupeKey })
    .returning({ id: notification.id });

  return rows.length > 0 ? { created: true, id: rows[0].id } : { created: false, id: null };
};

/** Records the same notification for several people, e.g. every owner. */
export const recordNotifications = async (
  tx: DbOrTx,
  userIds: readonly string[],
  build: (userId: string) => NotificationInput,
): Promise<number> => {
  let created = 0;

  for (const userId of new Set(userIds)) {
    const result = await recordNotification(tx, build(userId));
    if (result.created) {
      created += 1;
    }
  }

  return created;
};

// ---------------------------------------------------------------------------
// Who hears about it
// ---------------------------------------------------------------------------

/**
 * The person accountable for one application's reply.
 *
 * Assignee, else the role's hiring manager, else the company's SLA contact —
 * the same ladder `resolveResponsibleMemberId` encodes, resolved to a user so we
 * can actually reach them. Returns an empty list when nobody is accountable,
 * which is an operational fault worth seeing rather than papering over.
 */
export const resolveReplyRecipients = async (
  db: DbOrTx,
  input: {
    companyId: string;
    assigneeMemberId?: string | null;
    hiringManagerMemberId?: string | null;
  },
): Promise<string[]> => {
  const preferred = [input.assigneeMemberId, input.hiringManagerMemberId].filter(
    (value): value is string => Boolean(value),
  );

  if (preferred.length > 0) {
    const rows = await db
      .select({ userId: companyMember.userId, id: companyMember.id })
      .from(companyMember)
      .where(
        and(
          inArray(companyMember.id, preferred),
          eq(companyMember.companyId, input.companyId),
          isNull(companyMember.removedAt),
        ),
      );

    // Preserve the ladder's order rather than the database's.
    const byId = new Map(rows.map((row) => [row.id, row.userId]));
    const resolved = preferred.map((id) => byId.get(id)).filter(Boolean) as string[];

    if (resolved.length > 0) {
      return [resolved[0]];
    }
  }

  return escalationRecipients(db, input.companyId);
};

/**
 * Who an escalation goes to: the SLA contact and every owner.
 *
 * Both, not one. The SLA contact accepted the promise, and the owners are the
 * only people who can act if the contact has stopped reading their mail.
 */
export const escalationRecipients = async (
  db: DbOrTx,
  companyId: string,
): Promise<string[]> => {
  const rows = await db
    .select({ userId: companyMember.userId })
    .from(companyMember)
    .where(
      and(
        eq(companyMember.companyId, companyId),
        isNull(companyMember.removedAt),
        sql`(${companyMember.isSlaContact} OR ${companyMember.role} = 'owner')`,
      ),
    );

  return [...new Set(rows.map((row) => row.userId))];
};

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export const listNotifications = (db: Database, userId: string, limit = 30) =>
  db
    .select({
      id: notification.id,
      kind: notification.kind,
      title: notification.title,
      body: notification.body,
      href: notification.href,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
    })
    .from(notification)
    .where(eq(notification.userId, userId))
    .orderBy(desc(notification.createdAt))
    .limit(limit);

export const countUnread = async (db: Database, userId: string): Promise<number> => {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notification)
    .where(and(eq(notification.userId, userId), isNull(notification.readAt)));

  return rows[0]?.count ?? 0;
};

export const markNotificationsRead = async (
  db: Database,
  userId: string,
  now: Date = new Date(),
): Promise<void> => {
  await db
    .update(notification)
    .set({ readAt: now })
    .where(and(eq(notification.userId, userId), isNull(notification.readAt)));
};
