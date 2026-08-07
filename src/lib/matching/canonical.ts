import type { roleFamilyEnum, seniorityEnum, startupStageEnum } from "@/db/schema";

/**
 * What gets vectorized (docs/PRODUCT_PLAN.md §6.2).
 *
 * The decision this module exists to enforce: **candidate and job are rendered
 * by the same function into the same shape before embedding.**
 *
 * Why that is not optional. An embedding comparison is only meaningful when both
 * sides occupy the same semantic space. Embedding a résumé's raw text against a
 * job description's raw text compares two different *genres* of document — one
 * is a personal history, the other is marketing copy with a benefits section.
 * Cosine similarity then largely measures how much boilerplate each contains,
 * which is why naive résumé-to-JD vector search performs so poorly. Rendering
 * both through one template removes the genre difference and leaves the content.
 *
 * Symmetry is structural here, not a convention: there is one renderer and two
 * adapters, so the two sides cannot drift apart.
 */

export type RoleFamily = (typeof roleFamilyEnum.enumValues)[number];
export type Seniority = (typeof seniorityEnum.enumValues)[number];
export type StartupStage = (typeof startupStageEnum.enumValues)[number];

/**
 * The fields that carry matching signal.
 *
 * Note what is absent, deliberately — see `EXCLUDED_FROM_EMBEDDING` below.
 */
export type CanonicalFacets = {
  roleFamilies: readonly RoleFamily[];
  seniority: Seniority | null;
  yearsExperience: number | null;
  /** Company stages: where the person has worked, or where this role is. */
  stages: readonly StartupStage[];
  /** Team sizes joined at, or the team size for this role. */
  teamSizes: readonly number[];
  techStack: readonly string[];
  /** Product domains: "developer tools", "fintech". */
  domains: readonly string[];
  /**
   * Scope of ownership in prose, e.g. "first engineer in this function" or
   * "fourth engineer on the team". This is the trajectory signal that tags
   * cannot express (§1.2) and the reason we embed at all rather than only filter.
   */
  ownership: readonly string[];
};

/**
 * Fields deliberately kept out of the vector.
 *
 * These are **hard constraints**, resolved by SQL before any vector maths runs
 * (§6.2 step 1). Embedding them would make them fuzzy, and a vector that only
 * approximately respects a visa requirement is worse than useless: it produces
 * confident, plausible, wrong matches — exactly the failure mode we promise
 * candidates we do not have.
 *
 * Personal identifiers are excluded for a second reason: they add no matching
 * signal, and a stored embedding containing them becomes a re-identification
 * surface.
 */
export const EXCLUDED_FROM_EMBEDDING = [
  "timezone",
  "location",
  "visa",
  "salary",
  "equity",
  "name",
  "email",
  "phone",
  "company name",
] as const;

const MAX_ITEMS_PER_FACET = 12;

const normalizeTerm = (value: string): string => value.trim().toLowerCase();

const dedupe = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = normalizeTerm(value);
    if (normalized.length > 0 && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result.slice(0, MAX_ITEMS_PER_FACET);
};

const humanizeEnum = (value: string): string => value.replace(/_/g, " ");

const line = (label: string, value: string | null): string | null =>
  value && value.length > 0 ? `${label}: ${value}` : null;

/**
 * Renders facets into the canonical text that gets embedded.
 *
 * Stable field order and stable labels matter: the embedding model is sensitive
 * to surface form, so two inputs describing the same thing must produce the same
 * string. Absent facets are omitted rather than rendered as "none" — an explicit
 * "none" is itself content the model would try to match on.
 */
export const renderCanonical = (facets: CanonicalFacets): string => {
  const roleFamilies = dedupe(facets.roleFamilies.map(humanizeEnum));
  const stages = dedupe(facets.stages.filter((s) => s !== "unknown").map(humanizeEnum));
  const teamSizes = facets.teamSizes
    .filter((size) => Number.isFinite(size) && size > 0)
    .slice(0, MAX_ITEMS_PER_FACET)
    .map(String);

  return [
    line("Role", roleFamilies.join(", ")),
    line("Seniority", facets.seniority ? humanizeEnum(facets.seniority) : null),
    line(
      "Years of experience",
      facets.yearsExperience && facets.yearsExperience > 0
        ? String(facets.yearsExperience)
        : null,
    ),
    line("Company stage", stages.join(", ")),
    line("Team size", teamSizes.join(", ")),
    line("Technologies", dedupe(facets.techStack).join(", ")),
    line("Domains", dedupe(facets.domains).join(", ")),
    line("Ownership", dedupe(facets.ownership).join("; ")),
  ]
    .filter((entry): entry is string => entry !== null)
    .join("\n");
};

// ---------------------------------------------------------------------------
// Adapters — the only two ways to reach renderCanonical
// ---------------------------------------------------------------------------

export type CandidateTrajectoryInput = {
  roleFamilies?: readonly RoleFamily[] | null;
  seniority?: Seniority | null;
  yearsExperience?: number | null;
  techStack?: readonly string[] | null;
  experience: readonly {
    title: string;
    companyStageAtJoin?: StartupStage | null;
    teamSizeAtJoin?: number | null;
    wasFirstInFunction?: boolean | null;
  }[];
  domains?: readonly string[] | null;
};

/**
 * Renders a candidate.
 *
 * Ownership prose is generated from the trajectory rather than taken from the
 * résumé's own wording, so that "was employee #3" and "third engineer to join"
 * land in the same place.
 */
export const canonicalizeCandidate = (input: CandidateTrajectoryInput): string => {
  const ownership: string[] = [];

  const firstInFunctionCount = input.experience.filter((e) => e.wasFirstInFunction).length;
  if (firstInFunctionCount > 0) {
    ownership.push(
      firstInFunctionCount === 1
        ? "was first in this function at a company"
        : `was first in this function at ${firstInFunctionCount} companies`,
    );
  }

  const smallTeamJoins = input.experience.filter(
    (e) => typeof e.teamSizeAtJoin === "number" && e.teamSizeAtJoin > 0 && e.teamSizeAtJoin <= 10,
  ).length;
  if (smallTeamJoins > 0) {
    ownership.push("joined teams of ten or fewer");
  }

  return renderCanonical({
    roleFamilies: input.roleFamilies ?? [],
    seniority: input.seniority ?? null,
    yearsExperience: input.yearsExperience ?? null,
    stages: input.experience
      .map((e) => e.companyStageAtJoin)
      .filter((stage): stage is StartupStage => Boolean(stage)),
    teamSizes: input.experience
      .map((e) => e.teamSizeAtJoin)
      .filter((size): size is number => typeof size === "number"),
    techStack: input.techStack ?? [],
    domains: input.domains ?? [],
    ownership,
  });
};

export type JobCanonicalInput = {
  roleFamily?: RoleFamily | null;
  seniority?: Seniority | null;
  techStack?: readonly string[] | null;
  companyStage?: StartupStage | null;
  companyTeamSize?: number | null;
  domains?: readonly string[] | null;
  /** Extracted during normalization, e.g. "first data hire". */
  ownership?: readonly string[] | null;
};

/** Renders a job through the identical template. */
export const canonicalizeJob = (input: JobCanonicalInput): string =>
  renderCanonical({
    roleFamilies: input.roleFamily ? [input.roleFamily] : [],
    seniority: input.seniority ?? null,
    yearsExperience: null,
    stages: input.companyStage ? [input.companyStage] : [],
    teamSizes: typeof input.companyTeamSize === "number" ? [input.companyTeamSize] : [],
    techStack: input.techStack ?? [],
    domains: input.domains ?? [],
    ownership: input.ownership ?? [],
  });
