import { and, eq, isNull } from "drizzle-orm";

import type { Database } from "@/db/index";
import { company, companyMember } from "@/db/schema";
import {
  can,
  findMembership,
  type Capability,
  type CompanyRole,
} from "@/lib/company/permissions";

/**
 * Who is acting, and on behalf of which company.
 *
 * Every company-side operation goes through here. The shape is dictated by the
 * membership model (§6.6): a person can belong to several companies with a
 * different role in each, so an actor is never "a user with a role" — it is
 * always a user *plus the company they are acting for*. Any check that forgets
 * to name the company is a bug, and this module makes forgetting impossible.
 */

export type ActorMembership = {
  memberId: string;
  companyId: string;
  role: CompanyRole;
  removedAt: Date | null;
};

export type Actor = {
  userId: string;
  memberships: ActorMembership[];
};

/** Thrown when the actor may not do what they asked. */
export class ForbiddenError extends Error {
  constructor(
    message: string,
    readonly capability?: Capability,
    readonly companyId?: string,
  ) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/** Loads every company the user can act for. */
export const loadActor = async (db: Database, userId: string): Promise<Actor> => {
  const rows = await db
    .select({
      memberId: companyMember.id,
      companyId: companyMember.companyId,
      role: companyMember.role,
      removedAt: companyMember.removedAt,
    })
    .from(companyMember)
    .where(and(eq(companyMember.userId, userId), isNull(companyMember.removedAt)));

  return { userId, memberships: rows };
};

/**
 * Asserts a capability and returns the membership that granted it.
 *
 * Returning the membership is deliberate: callers almost always need the
 * `memberId` afterwards — to stamp an event actor, or to assign an application —
 * and fetching it separately invites using a membership from the wrong company.
 */
export const requireCapability = (
  actor: Actor,
  companyId: string,
  capability: Capability,
): ActorMembership => {
  const membership = findMembership(actor.memberships, companyId);

  if (!membership) {
    // Deliberately the same error as a capability failure: telling a stranger
    // "that company exists but you lack rights" leaks the company's existence.
    throw new ForbiddenError("Not a member of this company", capability, companyId);
  }

  if (!can({ memberships: actor.memberships, companyId, capability })) {
    throw new ForbiddenError(
      `Role "${membership.role}" cannot ${capability}`,
      capability,
      companyId,
    );
  }

  return membership as ActorMembership;
};

export type CompanyRow = typeof company.$inferSelect;

export const loadCompany = async (db: Database, companyId: string): Promise<CompanyRow> => {
  const row = await db.query.company.findFirst({ where: eq(company.id, companyId) });

  if (!row) {
    throw new NotFoundError(`Company ${companyId} not found`);
  }

  return row;
};

/**
 * Whether a company may have roles visible to candidates.
 *
 * The single gate every publish path must pass (§3.2). Both conditions are
 * load-bearing: the SLA is the promise itself, and domain verification is what
 * stops someone publishing roles in a company that is not theirs.
 */
export const canCompanyPublish = (
  row: Pick<CompanyRow, "lifecycle" | "slaAcceptedAt" | "domainVerifiedAt" | "suspendedForSlaAt">,
): { allowed: boolean; reason?: string } => {
  if (row.suspendedForSlaAt) {
    return { allowed: false, reason: "Suspended for repeatedly missing the response commitment" };
  }
  if (!row.domainVerifiedAt) {
    return { allowed: false, reason: "Company domain is not verified yet" };
  }
  if (!row.slaAcceptedAt) {
    return { allowed: false, reason: "The response commitment has not been accepted yet" };
  }
  if (row.lifecycle !== "onboarded") {
    return { allowed: false, reason: `Company is ${row.lifecycle}, not onboarded` };
  }

  return { allowed: true };
};
