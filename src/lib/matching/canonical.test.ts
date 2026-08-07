import { describe, expect, it } from "vitest";

import {
  canonicalizeCandidate,
  canonicalizeJob,
  EXCLUDED_FROM_EMBEDDING,
  renderCanonical,
  type CanonicalFacets,
} from "@/lib/matching/canonical";

const emptyFacets: CanonicalFacets = {
  roleFamilies: [],
  seniority: null,
  yearsExperience: null,
  stages: [],
  teamSizes: [],
  techStack: [],
  domains: [],
  ownership: [],
};

describe("symmetry between the two sides", () => {
  it("renders an equivalent candidate and job into the same labels", () => {
    // The property the whole design rests on: both sides occupy one semantic
    // space, so cosine distance measures content rather than document genre.
    const candidate = canonicalizeCandidate({
      roleFamilies: ["backend"],
      seniority: "senior",
      techStack: ["TypeScript", "Postgres"],
      experience: [{ title: "Senior Backend Engineer", companyStageAtJoin: "seed", teamSizeAtJoin: 8 }],
      domains: ["developer tools"],
    });

    const job = canonicalizeJob({
      roleFamily: "backend",
      seniority: "senior",
      techStack: ["TypeScript", "Postgres"],
      companyStage: "seed",
      companyTeamSize: 8,
      domains: ["developer tools"],
    });

    const labelsOf = (text: string) => text.split("\n").map((l) => l.split(":")[0]);

    // Job has no "Years of experience"; every label it does emit must match.
    for (const label of labelsOf(job)) {
      expect(labelsOf(candidate)).toContain(label);
    }

    expect(job).toContain("Role: backend");
    expect(candidate).toContain("Role: backend");
    expect(job).toContain("Company stage: seed");
    expect(candidate).toContain("Company stage: seed");
  });

  it("normalizes casing so the same technology matches itself", () => {
    const upper = canonicalizeJob({ techStack: ["TypeScript", "POSTGRES"] });
    const lower = canonicalizeJob({ techStack: ["typescript", "postgres"] });

    expect(upper).toBe(lower);
  });

  it("is stable for the same input", () => {
    const input = { roleFamily: "ml_ai" as const, techStack: ["python"] };
    expect(canonicalizeJob(input)).toBe(canonicalizeJob(input));
  });
});

describe("hard constraints stay out of the vector", () => {
  it("emits no field that belongs in a SQL filter", () => {
    // A vector that only approximately respects a visa requirement produces
    // confident, plausible, wrong matches — the exact failure we promise not to
    // have. These belong in step 1 of matching, not in the embedding.
    const candidate = canonicalizeCandidate({
      roleFamilies: ["backend"],
      seniority: "senior",
      yearsExperience: 9,
      techStack: ["go"],
      experience: [
        { title: "Staff Engineer", companyStageAtJoin: "series_a", teamSizeAtJoin: 20 },
      ],
      domains: ["fintech"],
    });

    const job = canonicalizeJob({
      roleFamily: "backend",
      seniority: "senior",
      techStack: ["go"],
      companyStage: "series_a",
      companyTeamSize: 20,
      domains: ["fintech"],
    });

    for (const forbidden of EXCLUDED_FROM_EMBEDDING) {
      expect(candidate.toLowerCase()).not.toContain(forbidden);
      expect(job.toLowerCase()).not.toContain(forbidden);
    }
  });

  it("does not leak identifiers even when they appear in a job title", () => {
    // Ownership prose is generated from the trajectory, never copied from the
    // résumé, so a company name in a title cannot reach the vector.
    const candidate = canonicalizeCandidate({
      roleFamilies: ["backend"],
      experience: [
        { title: "Engineer at Acme, ann@acme.ai", companyStageAtJoin: "seed", teamSizeAtJoin: 5 },
      ],
    });

    expect(candidate).not.toContain("Acme");
    expect(candidate).not.toContain("ann@acme.ai");
  });
});

describe("renderCanonical", () => {
  it("omits absent facets rather than writing 'none'", () => {
    // An explicit "none" is content the model would try to match on.
    expect(renderCanonical(emptyFacets)).toBe("");

    const partial = renderCanonical({ ...emptyFacets, roleFamilies: ["data"] });
    expect(partial).toBe("Role: data");
    expect(partial).not.toContain("Seniority");
  });

  it("keeps a stable field order", () => {
    const text = renderCanonical({
      roleFamilies: ["backend"],
      seniority: "staff",
      yearsExperience: 10,
      stages: ["seed"],
      teamSizes: [6],
      techStack: ["rust"],
      domains: ["infra"],
      ownership: ["was first in this function at a company"],
    });

    expect(text.split("\n").map((l) => l.split(":")[0])).toEqual([
      "Role",
      "Seniority",
      "Years of experience",
      "Company stage",
      "Team size",
      "Technologies",
      "Domains",
      "Ownership",
    ]);
  });

  it("humanizes enum underscores so the model sees words", () => {
    const text = renderCanonical({
      ...emptyFacets,
      roleFamilies: ["infra_devops", "ml_ai"],
      stages: ["series_a"],
    });

    expect(text).toContain("infra devops");
    expect(text).toContain("ml ai");
    expect(text).toContain("series a");
    expect(text).not.toContain("_");
  });

  it("drops the 'unknown' stage instead of embedding it as a value", () => {
    const text = renderCanonical({ ...emptyFacets, stages: ["unknown"] });
    expect(text).toBe("");
  });

  it("deduplicates repeated terms", () => {
    const text = renderCanonical({
      ...emptyFacets,
      techStack: ["Go", "go", " GO "],
    });

    expect(text).toBe("Technologies: go");
  });

  it("ignores nonsensical numbers", () => {
    const text = renderCanonical({
      ...emptyFacets,
      yearsExperience: 0,
      teamSizes: [0, -5, Number.NaN, 12],
    });

    expect(text).toBe("Team size: 12");
  });

  it("caps each facet so one long list cannot dominate the vector", () => {
    const text = renderCanonical({
      ...emptyFacets,
      techStack: Array.from({ length: 40 }, (_, i) => `tech${i}`),
    });

    expect(text.split(", ")).toHaveLength(12);
  });
});

describe("candidate ownership prose", () => {
  it("states being first in a function once", () => {
    const text = canonicalizeCandidate({
      experience: [{ title: "Eng", wasFirstInFunction: true, teamSizeAtJoin: 30 }],
    });

    expect(text).toContain("Ownership: was first in this function at a company");
  });

  it("counts repeated first-in-function roles", () => {
    const text = canonicalizeCandidate({
      experience: [
        { title: "Eng", wasFirstInFunction: true, teamSizeAtJoin: 40 },
        { title: "Eng", wasFirstInFunction: true, teamSizeAtJoin: 50 },
      ],
    });

    expect(text).toContain("was first in this function at 2 companies");
  });

  it("records joining small teams — the early-stage signal tags cannot express", () => {
    const text = canonicalizeCandidate({
      experience: [{ title: "Eng", teamSizeAtJoin: 4 }],
    });

    expect(text).toContain("joined teams of ten or fewer");
  });

  it("does not claim small-team experience for a large-team joiner", () => {
    const text = canonicalizeCandidate({
      experience: [{ title: "Eng", teamSizeAtJoin: 200 }],
    });

    expect(text).not.toContain("ten or fewer");
  });

  it("produces nothing for an empty trajectory", () => {
    expect(canonicalizeCandidate({ experience: [] })).toBe("");
  });
});
