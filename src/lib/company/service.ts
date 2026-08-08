import { and, eq, isNull, sql } from "drizzle-orm";

import type { Database } from "@/db/index";
import { company, companyInvite, companyMember, moderationItem } from "@/db/schema";
import { SLA_RESPONSE_DAYS, SLA_TERMS_VERSION } from "@/config/brand";
import {
  ForbiddenError,
  NotFoundError,
  loadCompany,
  requireCapability,
  type Actor,
} from "@/lib/company/context";
import {
  canChangeRole,
  canRemoveMember,
  type CompanyRole,
  type MemberRecord,
} from "@/lib/company/permissions";

/**
 * Company onboarding and membership (docs/PRODUCT_PLAN.md §3, §6.6).
 *
 * Services take `db` explicitly so they can be integration-tested against a real
 * Postgres without a Worker. Nothing here reads the environment.
 */

/** Free-mail domains cannot prove a company; those go to manual review. */
const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
  "yandex.ru",
  "mail.ru",
  "qq.com",
]);

const INVITE_TTL_DAYS = 14;

export const emailDomain = (email: string): string | null => {
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) {
    return null;
  }
  return email.slice(at + 1).trim().toLowerCase();
};

export const isPublicEmailDomain = (domain: string): boolean =>
  PUBLIC_EMAIL_DOMAINS.has(domain.toLowerCase());

export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const newId = () => crypto.randomUUID();

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export type CreateCompanyInput = {
  name: string;
  domain?: string | null;
  website?: string | null;
  description?: string | null;
};

/**
 * Creates a company with the caller as its owner.
 *
 * Starts in `onboarding`, never `onboarded`: publishing requires domain
 * verification and an accepted SLA, and jumping straight to onboarded would let
 * roles go live without either.
 */
export const createCompany = async (
  db: Database,
  actor: Actor,
  input: CreateCompanyInput,
): Promise<{ companyId: string; memberId: string }> => {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new Error("Company name is required");
  }

  const domain = input.domain?.trim().toLowerCase() || null;
  const companyId = newId();
  const memberId = newId();

  // Slug collisions are resolved by suffixing rather than failing the request:
  // two startups can legitimately share a name.
  const base = slugify(name) || "company";
  const taken = await db
    .select({ slug: company.slug })
    .from(company)
    .where(sql`${company.slug} = ${base} OR ${company.slug} LIKE ${`${base}-%`}`);
  const slug = taken.some((row) => row.slug === base)
    ? `${base}-${taken.length + 1}`
    : base;

  await db.insert(company).values({
    id: companyId,
    slug,
    name,
    domain,
    website: input.website?.trim() || null,
    description: input.description?.trim() || null,
    lifecycle: "onboarding",
    trustState: "qualified",
  });

  await db.insert(companyMember).values({
    id: memberId,
    companyId,
    userId: actor.userId,
    role: "owner",
    // The creator is the default recipient of SLA reminders until someone else
    // is named — an unaddressed obligation is one nobody acts on (§6.6).
    isSlaContact: true,
  });

  actor.memberships.push({ memberId, companyId, role: "owner", removedAt: null });

  return { companyId, memberId };
};

export type DomainVerificationOutcome =
  | { state: "verified" }
  | { state: "manual_review"; moderationItemId: string; reason: string };

/**
 * Verifies that the actor's work email proves control of the company domain.
 *
 * The caller is responsible for having confirmed the address itself (emailed
 * code); this records the outcome. A free-mail address cannot prove anything, so
 * it goes to manual review rather than being rejected — plenty of seed founders
 * still run on gmail, and refusing them outright would cost real customers.
 */
export const verifyCompanyDomain = async (
  db: Database,
  actor: Actor,
  input: { companyId: string; workEmail: string },
): Promise<DomainVerificationOutcome> => {
  const membership = requireCapability(actor, input.companyId, "editCompanyProfile");
  const row = await loadCompany(db, input.companyId);

  const domain = emailDomain(input.workEmail);
  if (!domain) {
    throw new Error(`"${input.workEmail}" is not a valid email address`);
  }

  await db
    .update(companyMember)
    .set({ workEmail: input.workEmail.toLowerCase(), workEmailVerifiedAt: new Date() })
    .where(eq(companyMember.id, membership.memberId));

  const matchesCompanyDomain = row.domain !== null && row.domain === domain;

  if (matchesCompanyDomain && !isPublicEmailDomain(domain)) {
    await db
      .update(company)
      .set({ domainVerifiedAt: new Date() })
      .where(eq(company.id, input.companyId));

    return { state: "verified" };
  }

  const reason = isPublicEmailDomain(domain)
    ? `Work email uses the public domain ${domain}, which cannot prove company ownership`
    : `Work email domain ${domain} does not match the company domain ${row.domain ?? "(unset)"}`;

  const moderationItemId = newId();
  await db.insert(moderationItem).values({
    id: moderationItemId,
    kind: "claim",
    companyId: input.companyId,
    payload: { userId: actor.userId, workEmail: input.workEmail, domain, reason },
    // Above new_company in the queue: a real person is blocked, waiting (§6.5).
    priority: 50,
  });

  return { state: "manual_review", moderationItemId, reason };
};

/**
 * Records acceptance of the response commitment.
 *
 * Owner-only, because it binds the whole company and opens publication (§6.6).
 * The accepted window and the terms version are both stored: if the terms later
 * change, this company keeps what it actually agreed to rather than having its
 * public promise silently restated.
 */
export const acceptSla = async (
  db: Database,
  actor: Actor,
  input: { companyId: string; responseDays?: number },
): Promise<{ responseDays: number; termsVersion: string }> => {
  requireCapability(actor, input.companyId, "acceptSla");
  const row = await loadCompany(db, input.companyId);

  const responseDays = input.responseDays ?? SLA_RESPONSE_DAYS;
  if (!Number.isInteger(responseDays) || responseDays < 1 || responseDays > 30) {
    throw new Error("Response window must be between 1 and 30 days");
  }

  const now = new Date();

  await db
    .update(company)
    .set({
      slaResponseDays: responseDays,
      slaAcceptedAt: now,
      slaAcceptedByUserId: actor.userId,
      slaTermsVersion: SLA_TERMS_VERSION,
      // Onboarding completes only once the domain is also proven.
      lifecycle: row.domainVerifiedAt ? "onboarded" : row.lifecycle,
    })
    .where(eq(company.id, input.companyId));

  return { responseDays, termsVersion: SLA_TERMS_VERSION };
};

/** Moves a company to `onboarded` once both gates are satisfied. */
export const completeOnboardingIfReady = async (
  db: Database,
  companyId: string,
): Promise<boolean> => {
  const row = await loadCompany(db, companyId);

  if (row.lifecycle === "onboarded" || !row.domainVerifiedAt || !row.slaAcceptedAt) {
    return false;
  }

  await db.update(company).set({ lifecycle: "onboarded" }).where(eq(company.id, companyId));
  return true;
};

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

const loadMembers = async (db: Database, companyId: string): Promise<MemberRecord[]> => {
  const rows = await db
    .select({
      memberId: companyMember.id,
      companyId: companyMember.companyId,
      role: companyMember.role,
      removedAt: companyMember.removedAt,
    })
    .from(companyMember)
    .where(eq(companyMember.companyId, companyId));

  return rows;
};

export const inviteMember = async (
  db: Database,
  actor: Actor,
  input: { companyId: string; email: string; role: CompanyRole },
): Promise<{ inviteId: string; token: string; expiresAt: Date }> => {
  requireCapability(actor, input.companyId, "inviteMember");

  const email = input.email.trim().toLowerCase();
  if (!emailDomain(email)) {
    throw new Error(`"${input.email}" is not a valid email address`);
  }

  // Only an owner may mint another owner: inviting at your own level is one
  // thing, handing out the level that can remove you is another.
  if (input.role === "owner") {
    requireCapability(actor, input.companyId, "transferOwnership");
  }

  // A pending invite is unique per (company, email), so re-inviting supersedes
  // rather than colliding.
  await db
    .update(companyInvite)
    .set({ state: "revoked" })
    .where(
      and(
        eq(companyInvite.companyId, input.companyId),
        eq(companyInvite.email, email),
        eq(companyInvite.state, "pending"),
      ),
    );

  const inviteId = newId();
  const token = crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(companyInvite).values({
    id: inviteId,
    companyId: input.companyId,
    email,
    role: input.role,
    token,
    invitedByUserId: actor.userId,
    expiresAt,
  });

  return { inviteId, token, expiresAt };
};

/**
 * Accepts an invitation.
 *
 * Not guarded by `requireCapability`: the whole point is that the accepter is
 * not yet a member. The token is the authorization, and it is checked against
 * expiry and state here.
 */
export const acceptInvite = async (
  db: Database,
  input: { token: string; userId: string },
): Promise<{ companyId: string; memberId: string; role: CompanyRole }> => {
  const invite = await db.query.companyInvite.findFirst({
    where: eq(companyInvite.token, input.token),
  });

  if (!invite) {
    throw new NotFoundError("Invitation not found");
  }
  if (invite.state !== "pending") {
    throw new ForbiddenError(`Invitation is ${invite.state}`);
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    await db
      .update(companyInvite)
      .set({ state: "expired" })
      .where(eq(companyInvite.id, invite.id));
    throw new ForbiddenError("Invitation has expired");
  }

  const existing = await db.query.companyMember.findFirst({
    where: and(
      eq(companyMember.companyId, invite.companyId),
      eq(companyMember.userId, input.userId),
    ),
  });

  const memberId = existing?.id ?? newId();

  if (existing) {
    // Re-joining after removal restores membership rather than failing on the
    // unique constraint.
    await db
      .update(companyMember)
      .set({ role: invite.role, removedAt: null })
      .where(eq(companyMember.id, existing.id));
  } else {
    await db.insert(companyMember).values({
      id: memberId,
      companyId: invite.companyId,
      userId: input.userId,
      role: invite.role,
      invitedByUserId: invite.invitedByUserId,
    });
  }

  await db
    .update(companyInvite)
    .set({ state: "accepted", acceptedAt: new Date(), acceptedByUserId: input.userId })
    .where(eq(companyInvite.id, invite.id));

  return { companyId: invite.companyId, memberId, role: invite.role };
};

export const removeMember = async (
  db: Database,
  actor: Actor,
  input: { companyId: string; memberId: string },
): Promise<void> => {
  requireCapability(actor, input.companyId, "removeMember");

  const members = await loadMembers(db, input.companyId);
  const verdict = canRemoveMember({ members, memberId: input.memberId });

  if (!verdict.allowed) {
    throw new ForbiddenError(verdict.reason ?? "Cannot remove this member");
  }

  // Soft removal: historical events must keep their author (§6.6).
  await db
    .update(companyMember)
    .set({ removedAt: new Date(), isSlaContact: false })
    .where(eq(companyMember.id, input.memberId));
};

export const changeMemberRole = async (
  db: Database,
  actor: Actor,
  input: { companyId: string; memberId: string; newRole: CompanyRole },
): Promise<void> => {
  requireCapability(actor, input.companyId, "removeMember");

  if (input.newRole === "owner") {
    requireCapability(actor, input.companyId, "transferOwnership");
  }

  const members = await loadMembers(db, input.companyId);
  const verdict = canChangeRole({
    members,
    memberId: input.memberId,
    newRole: input.newRole,
  });

  if (!verdict.allowed) {
    throw new ForbiddenError(verdict.reason ?? "Cannot change this member's role");
  }

  await db
    .update(companyMember)
    .set({ role: input.newRole })
    .where(eq(companyMember.id, input.memberId));
};

/**
 * Names the fallback recipient of SLA reminders.
 *
 * Clearing the previous holder first is required, not tidiness: the database
 * enforces at most one active SLA contact per company (§6.6).
 */
export const setSlaContact = async (
  db: Database,
  actor: Actor,
  input: { companyId: string; memberId: string },
): Promise<void> => {
  requireCapability(actor, input.companyId, "setSlaContact");

  const target = await db.query.companyMember.findFirst({
    where: and(
      eq(companyMember.id, input.memberId),
      eq(companyMember.companyId, input.companyId),
      isNull(companyMember.removedAt),
    ),
  });

  if (!target) {
    throw new NotFoundError("Member not found in this company");
  }

  await db
    .update(companyMember)
    .set({ isSlaContact: false })
    .where(
      and(eq(companyMember.companyId, input.companyId), eq(companyMember.isSlaContact, true)),
    );

  await db
    .update(companyMember)
    .set({ isSlaContact: true })
    .where(eq(companyMember.id, input.memberId));
};

export const listMembers = async (
  db: Database,
  actor: Actor,
  companyId: string,
) => {
  requireCapability(actor, companyId, "viewCompany");

  return db.query.companyMember.findMany({
    where: and(eq(companyMember.companyId, companyId), isNull(companyMember.removedAt)),
    with: { user: { columns: { id: true, name: true, email: true, image: true } } },
  });
};
