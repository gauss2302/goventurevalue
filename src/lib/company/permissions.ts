import type { companyRoleEnum } from "@/db/schema";

/**
 * Company roles and what they may do.
 *
 * A company has many members, and one person may belong to several companies —
 * fractional recruiters and founders who advise elsewhere are normal, not edge
 * cases. Membership is therefore keyed on (company, user), never on user alone.
 *
 * Within one company a person holds exactly **one** role, and roles are a
 * hierarchy rather than a set of orthogonal capabilities. That is a deliberate
 * simplification: at 5–60 people nobody thinks "she is an admin *and* a
 * recruiter", they think "she runs hiring". A cumulative ladder is predictable
 * and cheap to reason about; capability sets invite questions like "what does
 * recruiter-but-not-viewer mean" that have no useful answer at this size.
 *
 * If that ever stops holding, the migration is additive — a `company_member_role`
 * join table — and this module is the only place that needs to change.
 *
 * Free of database and Worker imports so it stays unit-testable.
 */

export type CompanyRole = (typeof companyRoleEnum.enumValues)[number];

/**
 * Seniority ladder. Higher rank implies every capability of the ranks below.
 */
const ROLE_RANK: Record<CompanyRole, number> = {
  viewer: 0,
  recruiter: 1,
  admin: 2,
  owner: 3,
};

export const ROLES_BY_SENIORITY: readonly CompanyRole[] = ["owner", "admin", "recruiter", "viewer"];

/**
 * Capabilities, each pinned to the lowest role that holds it.
 *
 * Two entries deserve explanation because they encode product decisions rather
 * than convention:
 *
 *  - `respondToApplication` sits at `recruiter`. Answering candidates is the
 *    company's core obligation (docs/PRODUCT_PLAN.md §3.2), so it must not
 *    require elevated rights — an SLA that only admins can discharge is an SLA
 *    that gets missed.
 *  - `acceptSla` sits at `owner`. Accepting the response commitment binds the
 *    whole company and gates publication, so it belongs to whoever can speak
 *    for it.
 */
const CAPABILITY_MIN_ROLE = {
  viewCompany: "viewer",
  viewApplications: "viewer",

  respondToApplication: "recruiter",
  changeApplicationStatus: "recruiter",
  assignApplication: "recruiter",
  manageJobs: "recruiter",

  editCompanyProfile: "admin",
  connectAtsFeed: "admin",
  inviteMember: "admin",
  removeMember: "admin",
  setSlaContact: "admin",

  acceptSla: "owner",
  manageBilling: "owner",
  transferOwnership: "owner",
  deleteCompany: "owner",
} as const satisfies Record<string, CompanyRole>;

export type Capability = keyof typeof CAPABILITY_MIN_ROLE;

export const ALL_CAPABILITIES = Object.keys(CAPABILITY_MIN_ROLE) as Capability[];

/** A membership as far as authorization is concerned. */
export type Membership = {
  companyId: string;
  role: CompanyRole;
  /** Soft-removed members keep their history but lose every capability. */
  removedAt?: Date | null;
};

export const isActive = (membership: Membership): boolean => !membership.removedAt;

export const roleAtLeast = (role: CompanyRole, minimum: CompanyRole): boolean =>
  ROLE_RANK[role] >= ROLE_RANK[minimum];

/** Whether a role grants a capability. */
export const roleCan = (role: CompanyRole, capability: Capability): boolean =>
  roleAtLeast(role, CAPABILITY_MIN_ROLE[capability]);

/**
 * Whether a user may perform `capability` on `companyId`.
 *
 * Takes the full membership list because a user can belong to several companies:
 * holding `owner` at one company must grant nothing at another. Every
 * authorization check has to name the company it is about.
 */
export const can = (input: {
  memberships: readonly Membership[];
  companyId: string;
  capability: Capability;
}): boolean => {
  const membership = findMembership(input.memberships, input.companyId);
  return membership ? roleCan(membership.role, input.capability) : false;
};

export const findMembership = (
  memberships: readonly Membership[],
  companyId: string,
): Membership | null =>
  memberships.find((m) => m.companyId === companyId && isActive(m)) ?? null;

/** Companies the user can currently act for — drives the company switcher. */
export const activeCompanyIds = (memberships: readonly Membership[]): string[] =>
  memberships.filter(isActive).map((m) => m.companyId);

// ---------------------------------------------------------------------------
// Invariants
// ---------------------------------------------------------------------------

export type MemberRecord = Membership & { memberId: string };

/**
 * Whether a member may be removed, or demoted out of `owner`.
 *
 * A company must always retain at least one active owner. Losing the last one
 * leaves nobody able to accept the SLA, manage billing or transfer ownership —
 * an orphaned company that only manual intervention can rescue. Co-founders as
 * multiple owners are expected and fine.
 */
export const canRemoveMember = (input: {
  members: readonly MemberRecord[];
  memberId: string;
}): { allowed: boolean; reason?: string } => {
  const target = input.members.find((m) => m.memberId === input.memberId);

  if (!target || !isActive(target)) {
    return { allowed: false, reason: "Member not found" };
  }

  if (target.role !== "owner") {
    return { allowed: true };
  }

  const otherOwners = input.members.filter(
    (m) => m.memberId !== input.memberId && isActive(m) && m.role === "owner",
  );

  return otherOwners.length > 0
    ? { allowed: true }
    : { allowed: false, reason: "A company must keep at least one owner" };
};

export const canChangeRole = (input: {
  members: readonly MemberRecord[];
  memberId: string;
  newRole: CompanyRole;
}): { allowed: boolean; reason?: string } => {
  const target = input.members.find((m) => m.memberId === input.memberId);

  if (!target || !isActive(target)) {
    return { allowed: false, reason: "Member not found" };
  }

  if (target.role === input.newRole) {
    return { allowed: true };
  }

  // Demoting the last owner orphans the company just as removing them would.
  if (target.role === "owner") {
    return canRemoveMember({ members: input.members, memberId: input.memberId });
  }

  return { allowed: true };
};

/**
 * Who should be nudged about an unanswered application.
 *
 * Falls back through assignee → hiring manager → SLA contact, and finally to any
 * active member who can actually respond. Returning an empty list means the
 * company has nobody able to answer, which is a suspension-worthy state rather
 * than something to silently absorb.
 */
export const slaNotificationTargets = (input: {
  members: readonly MemberRecord[];
  assigneeMemberId?: string | null;
  hiringManagerMemberId?: string | null;
  slaContactMemberId?: string | null;
}): string[] => {
  const active = input.members.filter(isActive);
  const byId = new Map(active.map((m) => [m.memberId, m]));

  for (const candidate of [
    input.assigneeMemberId,
    input.hiringManagerMemberId,
    input.slaContactMemberId,
  ]) {
    if (candidate && byId.has(candidate)) {
      return [candidate];
    }
  }

  return active
    .filter((m) => roleCan(m.role, "respondToApplication"))
    .map((m) => m.memberId);
};
