import { describe, expect, it } from "vitest";

import {
  BLOCKER_REASONS,
  checkEligibility,
  currentQuotaWindow,
  nextQuotaReset,
  scoreMatch,
  seniorityDistance,
  type CandidateConstraints,
  type RoleConstraints,
} from "@/lib/matching/eligibility";

const candidate: CandidateConstraints = {
  roleFamilies: ["backend"],
  seniority: "senior",
  timezone: "Europe/Berlin",
  openTo: "remote",
  needsVisa: false,
  salaryExpectationMin: 120_000,
  preferredStages: ["seed"],
  techStack: ["typescript", "postgres"],
};

const role: RoleConstraints = {
  roleFamily: "backend",
  seniority: "senior",
  remoteType: "remote",
  visaSponsorship: null,
  salaryIsPublic: true,
  salaryMin: 140_000,
  salaryMax: 180_000,
  techStack: ["TypeScript", "Postgres", "Kubernetes"],
  companyStage: "seed",
};

describe("hard constraints", () => {
  it("allows a match on every axis", () => {
    expect(checkEligibility(candidate, role).allowed).toBe(true);
  });

  it("blocks a different function", () => {
    const result = checkEligibility(candidate, { ...role, roleFamily: "ml_ai" });

    expect(result.allowed).toBe(false);
    expect(result.blockers).toEqual(["role_family"]);
  });

  it("allows a one-level stretch but not two", () => {
    // A senior reaching for staff is normal. A junior reaching for principal
    // costs the company an obligation to reply for nothing.
    expect(checkEligibility(candidate, { ...role, seniority: "staff" }).allowed).toBe(true);
    expect(checkEligibility(candidate, { ...role, seniority: "principal" }).allowed).toBe(false);
    expect(seniorityDistance("junior", "principal")).toBe(4);
  });

  it("treats someone open to onsite as open to remote, not the reverse", () => {
    const onsiteOk = { ...candidate, openTo: "onsite" as const };
    expect(checkEligibility(onsiteOk, { ...role, remoteType: "remote" }).allowed).toBe(true);

    const remoteOnly = { ...candidate, openTo: "remote" as const };
    expect(checkEligibility(remoteOnly, { ...role, remoteType: "onsite" }).allowed).toBe(false);
  });

  it("blocks only an explicit refusal to sponsor", () => {
    const needsVisa = { ...candidate, needsVisa: true };

    // Silence is not a refusal (§6.4 rule 2).
    expect(checkEligibility(needsVisa, { ...role, visaSponsorship: null }).allowed).toBe(true);
    expect(checkEligibility(needsVisa, { ...role, visaSponsorship: true }).allowed).toBe(true);

    const refused = checkEligibility(needsVisa, { ...role, visaSponsorship: false });
    expect(refused.blockers).toEqual(["visa"]);
  });

  it("blocks only on a published band that genuinely falls short", () => {
    const low = { ...role, salaryMin: 60_000, salaryMax: 80_000 };
    expect(checkEligibility(candidate, low).blockers).toEqual(["salary"]);

    // A withheld band says nothing, so it cannot be read as a low one.
    expect(
      checkEligibility(candidate, { ...low, salaryIsPublic: false }).allowed,
    ).toBe(true);
  });

  it("does not block when either side left the field empty", () => {
    // An empty profile should not be silently unable to apply anywhere; the
    // onboarding gate handles incomplete profiles, not this.
    const empty: CandidateConstraints = {
      roleFamilies: [],
      seniority: null,
      timezone: null,
      openTo: null,
      needsVisa: null,
      salaryExpectationMin: null,
      preferredStages: null,
      techStack: null,
    };

    expect(checkEligibility(empty, role).allowed).toBe(true);
  });

  it("explains every blocker it reports", () => {
    const result = checkEligibility(
      { ...candidate, needsVisa: true, roleFamilies: ["frontend"] },
      { ...role, visaSponsorship: false },
    );

    expect(result.reasons).toHaveLength(result.blockers.length);
    for (const reason of Object.values(BLOCKER_REASONS)) {
      expect(reason.length).toBeGreaterThan(0);
    }
  });
});

describe("match scoring and explanations", () => {
  it("scores a strong match highly and says why", () => {
    const { score, reasons } = scoreMatch(candidate, role);

    expect(score).toBeGreaterThan(0.8);
    expect(reasons.map((r) => r.kind)).toContain("role_family");
    expect(reasons.map((r) => r.kind)).toContain("seniority");
    expect(reasons.map((r) => r.kind)).toContain("tech");
  });

  it("matches technologies case-insensitively", () => {
    const { reasons } = scoreMatch(candidate, role);
    const tech = reasons.find((r) => r.kind === "tech");

    expect(tech?.text).toMatch(/typescript/i);
  });

  it("scores lower for a stretch than for an exact level", () => {
    const exact = scoreMatch(candidate, role).score;
    const stretch = scoreMatch(candidate, { ...role, seniority: "staff" }).score;

    expect(stretch).toBeLessThan(exact);
  });

  it("gives no reasons it cannot point at", () => {
    // Every explanation must come from a fact on both records — a
    // recommendation nobody can check is one nobody trusts.
    const { reasons } = scoreMatch(
      { ...candidate, techStack: [], preferredStages: [] },
      { ...role, techStack: [], companyStage: null },
    );

    expect(reasons.map((r) => r.kind)).not.toContain("tech");
    expect(reasons.map((r) => r.kind)).not.toContain("stage");
  });

  it("never exceeds one", () => {
    expect(scoreMatch(candidate, role).score).toBeLessThanOrEqual(1);
  });
});

describe("weekly application window", () => {
  it("anchors to Monday UTC", () => {
    expect(currentQuotaWindow(new Date("2026-08-05T12:00:00Z"))).toBe("2026-08-03");
    expect(currentQuotaWindow(new Date("2026-08-03T00:00:00Z"))).toBe("2026-08-03");
  });

  it("puts Sunday in the week that began six days earlier", () => {
    // The classic off-by-one: getUTCDay returns 0 for Sunday.
    expect(currentQuotaWindow(new Date("2026-08-09T23:59:59Z"))).toBe("2026-08-03");
  });

  it("rolls over on the next Monday", () => {
    expect(currentQuotaWindow(new Date("2026-08-10T00:00:00Z"))).toBe("2026-08-10");
  });

  it("reports when the allowance comes back", () => {
    // A fixed calendar week so a candidate can plan; a rolling window drips
    // applications back one at a time in a way nobody can predict.
    expect(nextQuotaReset(new Date("2026-08-05T12:00:00Z")).toISOString()).toBe(
      "2026-08-10T00:00:00.000Z",
    );
  });
});
