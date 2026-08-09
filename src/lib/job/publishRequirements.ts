import type { RoleFamily, Seniority } from "@/lib/matching/canonical";
import type { remoteTypeEnum } from "@/db/schema";

export type RemoteType = (typeof remoteTypeEnum.enumValues)[number];

/**
 * What a role must contain before candidates can see it
 * (docs/PRODUCT_PLAN.md §1.4, §6.2).
 *
 * The company gates — accepted SLA, verified domain — say whether a company may
 * publish at all. These say whether *this role* is worth publishing.
 *
 * Nothing is required for tidiness. Each field either feeds a hard filter in
 * matching (§6.2 step 1) or is what a candidate needs in order to decide. A
 * listing missing them is the noise we position against: it either cannot be
 * matched to anyone, or it wastes the reader's time.
 *
 * Free of database and Worker imports so it stays unit-testable.
 */

export const MIN_DESCRIPTION_LENGTH = 120;

export const ROLE_REQUIREMENT_REASONS = {
  title: "A candidate has to know what the job is called",
  description:
    "Too short to judge. Say what the person will own, who they work with, and how the team is set up",
  roleFamily: "Matching filters by function — without it this role reaches nobody",
  seniority: "Matching filters by level — without it this role reaches nobody",
  remoteType: "Candidates filter by remote, hybrid and onsite before anything else",
  location: "An onsite or hybrid role needs a location, otherwise nobody can tell where it is",
  salaryBand: "A band marked public needs at least one bound, or it shows a promise with nothing in it",
} as const;

export type RoleRequirement = keyof typeof ROLE_REQUIREMENT_REASONS;

export type PublishableRole = {
  title?: string | null;
  descriptionMd?: string | null;
  roleFamily?: RoleFamily | null;
  seniority?: Seniority | null;
  remoteType?: RemoteType | null;
  locations?: readonly string[] | null;
  salaryIsPublic?: boolean | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
};

/**
 * Requirements this role does not yet meet.
 *
 * Note what is *not* here: a salary band is optional. Withholding it is an
 * honest choice we render as "not disclosed" (§6.4 rule 2); claiming to show one
 * while showing nothing is not.
 */
export const missingRoleRequirements = (role: PublishableRole): RoleRequirement[] => {
  const missing: RoleRequirement[] = [];

  if (!role.title || role.title.trim().length === 0) {
    missing.push("title");
  }

  if ((role.descriptionMd ?? "").trim().length < MIN_DESCRIPTION_LENGTH) {
    missing.push("description");
  }

  if (!role.roleFamily) {
    missing.push("roleFamily");
  }

  if (!role.seniority) {
    missing.push("seniority");
  }

  if (!role.remoteType) {
    missing.push("remoteType");
  }

  if (
    (role.remoteType === "onsite" || role.remoteType === "hybrid") &&
    (role.locations ?? []).length === 0
  ) {
    missing.push("location");
  }

  if (
    role.salaryIsPublic &&
    (role.salaryMin ?? null) === null &&
    (role.salaryMax ?? null) === null
  ) {
    missing.push("salaryBand");
  }

  return missing;
};

export type RoleReadiness = {
  ready: boolean;
  missing: RoleRequirement[];
  reasons: string[];
  /** 0–1, for the checklist progress indicator. */
  completeness: number;
};

const TOTAL_BASE_REQUIREMENTS = 5; // title, description, roleFamily, seniority, remoteType

export const roleReadiness = (role: PublishableRole): RoleReadiness => {
  const missing = missingRoleRequirements(role);

  // Conditional requirements are not part of the baseline count, so completeness
  // cannot read as more than 100% for a remote role.
  const baseMissing = missing.filter(
    (requirement) => requirement !== "location" && requirement !== "salaryBand",
  ).length;

  return {
    ready: missing.length === 0,
    missing,
    reasons: missing.map((requirement) => ROLE_REQUIREMENT_REASONS[requirement]),
    completeness: (TOTAL_BASE_REQUIREMENTS - baseMissing) / TOTAL_BASE_REQUIREMENTS,
  };
};
