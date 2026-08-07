import { describe, expect, it } from "vitest";

import {
  ALL_CAPABILITIES,
  activeCompanyIds,
  can,
  canChangeRole,
  canRemoveMember,
  findMembership,
  roleAtLeast,
  roleCan,
  ROLES_BY_SENIORITY,
  slaNotificationTargets,
  type CompanyRole,
  type MemberRecord,
} from "@/lib/company/permissions";

const member = (
  memberId: string,
  role: CompanyRole,
  overrides: Partial<MemberRecord> = {},
): MemberRecord => ({
  memberId,
  companyId: "co-1",
  role,
  removedAt: null,
  ...overrides,
});

describe("role hierarchy", () => {
  it("is cumulative — a higher role holds every capability below it", () => {
    for (const capability of ALL_CAPABILITIES) {
      const holders = ROLES_BY_SENIORITY.filter((role) => roleCan(role, capability));

      // Holders must be a prefix of the seniority ladder: no gaps.
      const expectedPrefix = ROLES_BY_SENIORITY.slice(0, holders.length);
      expect(holders).toEqual(expectedPrefix);
    }
  });

  it("orders viewer below recruiter below admin below owner", () => {
    expect(roleAtLeast("owner", "admin")).toBe(true);
    expect(roleAtLeast("admin", "recruiter")).toBe(true);
    expect(roleAtLeast("recruiter", "viewer")).toBe(true);
    expect(roleAtLeast("viewer", "recruiter")).toBe(false);
  });

  it("lets a recruiter answer candidates without elevated rights", () => {
    // The core obligation (§3.2). An SLA only admins can discharge is an SLA
    // that gets missed.
    expect(roleCan("recruiter", "respondToApplication")).toBe(true);
    expect(roleCan("recruiter", "changeApplicationStatus")).toBe(true);
  });

  it("keeps a viewer read-only", () => {
    expect(roleCan("viewer", "viewApplications")).toBe(true);
    expect(roleCan("viewer", "respondToApplication")).toBe(false);
    expect(roleCan("viewer", "manageJobs")).toBe(false);
  });

  it("reserves the SLA commitment and billing for owners", () => {
    expect(roleCan("admin", "acceptSla")).toBe(false);
    expect(roleCan("owner", "acceptSla")).toBe(true);
    expect(roleCan("admin", "manageBilling")).toBe(false);
    expect(roleCan("owner", "manageBilling")).toBe(true);
  });

  it("lets an admin manage the team but not bind the company", () => {
    expect(roleCan("admin", "inviteMember")).toBe(true);
    expect(roleCan("admin", "connectAtsFeed")).toBe(true);
    expect(roleCan("admin", "transferOwnership")).toBe(false);
  });
});

describe("multi-company membership", () => {
  const memberships = [
    { companyId: "co-1", role: "owner" as CompanyRole, removedAt: null },
    { companyId: "co-2", role: "recruiter" as CompanyRole, removedAt: null },
  ];

  it("scopes every capability to the named company", () => {
    // Owning one company must grant nothing at another — a fractional recruiter
    // working with several startups is a normal case, not an edge case.
    expect(can({ memberships, companyId: "co-1", capability: "manageBilling" })).toBe(true);
    expect(can({ memberships, companyId: "co-2", capability: "manageBilling" })).toBe(false);
    expect(can({ memberships, companyId: "co-2", capability: "respondToApplication" })).toBe(true);
  });

  it("denies everything for a company the user does not belong to", () => {
    expect(can({ memberships, companyId: "co-3", capability: "viewCompany" })).toBe(false);
  });

  it("lists the companies a user can act for", () => {
    expect(activeCompanyIds(memberships)).toEqual(["co-1", "co-2"]);
  });

  it("strips capabilities from a removed member but keeps the record", () => {
    const removed = [
      { companyId: "co-1", role: "owner" as CompanyRole, removedAt: new Date() },
    ];

    expect(can({ memberships: removed, companyId: "co-1", capability: "viewCompany" })).toBe(false);
    expect(findMembership(removed, "co-1")).toBeNull();
    expect(activeCompanyIds(removed)).toEqual([]);
  });
});

describe("owner invariant", () => {
  it("refuses to remove the last owner", () => {
    // Losing the last owner leaves nobody able to accept the SLA, manage
    // billing or transfer ownership.
    const members = [member("m1", "owner"), member("m2", "recruiter")];

    const result = canRemoveMember({ members, memberId: "m1" });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/at least one owner/i);
  });

  it("allows removing an owner when a co-founder remains", () => {
    const members = [member("m1", "owner"), member("m2", "owner")];

    expect(canRemoveMember({ members, memberId: "m1" }).allowed).toBe(true);
  });

  it("does not count a removed owner as cover", () => {
    const members = [member("m1", "owner"), member("m2", "owner", { removedAt: new Date() })];

    expect(canRemoveMember({ members, memberId: "m1" }).allowed).toBe(false);
  });

  it("allows removing non-owners freely", () => {
    const members = [member("m1", "owner"), member("m2", "admin")];

    expect(canRemoveMember({ members, memberId: "m2" }).allowed).toBe(true);
  });

  it("refuses to demote the last owner", () => {
    // Demotion orphans the company exactly as removal would.
    const members = [member("m1", "owner"), member("m2", "admin")];

    expect(canChangeRole({ members, memberId: "m1", newRole: "admin" }).allowed).toBe(false);
  });

  it("allows demoting an owner when another remains", () => {
    const members = [member("m1", "owner"), member("m2", "owner")];

    expect(canChangeRole({ members, memberId: "m1", newRole: "recruiter" }).allowed).toBe(true);
  });

  it("treats a no-op role change as allowed", () => {
    const members = [member("m1", "owner")];

    expect(canChangeRole({ members, memberId: "m1", newRole: "owner" }).allowed).toBe(true);
  });

  it("allows promoting anyone to owner", () => {
    const members = [member("m1", "owner"), member("m2", "viewer")];

    expect(canChangeRole({ members, memberId: "m2", newRole: "owner" }).allowed).toBe(true);
  });
});

describe("slaNotificationTargets", () => {
  const members = [
    member("m-owner", "owner"),
    member("m-recruiter", "recruiter"),
    member("m-viewer", "viewer"),
  ];

  it("nudges the assignee when there is one", () => {
    expect(
      slaNotificationTargets({
        members,
        assigneeMemberId: "m-recruiter",
        hiringManagerMemberId: "m-owner",
        slaContactMemberId: "m-owner",
      }),
    ).toEqual(["m-recruiter"]);
  });

  it("falls back to the hiring manager, then the SLA contact", () => {
    expect(
      slaNotificationTargets({ members, hiringManagerMemberId: "m-owner" }),
    ).toEqual(["m-owner"]);

    expect(slaNotificationTargets({ members, slaContactMemberId: "m-recruiter" })).toEqual([
      "m-recruiter",
    ]);
  });

  it("skips a designated person who has been removed", () => {
    const withRemoved = [
      member("m-gone", "recruiter", { removedAt: new Date() }),
      member("m-owner", "owner"),
    ];

    // The assignee left the company; the nudge must not vanish with them.
    expect(
      slaNotificationTargets({
        members: withRemoved,
        assigneeMemberId: "m-gone",
        slaContactMemberId: "m-owner",
      }),
    ).toEqual(["m-owner"]);
  });

  it("nudges everyone who can respond when nobody is designated", () => {
    const targets = slaNotificationTargets({ members });

    expect(targets).toContain("m-owner");
    expect(targets).toContain("m-recruiter");
    // A viewer cannot answer, so nudging them would be noise.
    expect(targets).not.toContain("m-viewer");
  });

  it("returns nobody when the company has no one able to answer", () => {
    // A suspension-worthy state, surfaced rather than silently absorbed.
    expect(slaNotificationTargets({ members: [member("m-viewer", "viewer")] })).toEqual([]);
  });
});
