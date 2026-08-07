import type { remoteTypeEnum } from "@/db/schema";
import type { RoleFamily, Seniority, StartupStage } from "@/lib/matching/canonical";

/**
 * Candidate onboarding as a process, not a table (docs/PRODUCT_PLAN.md §6.2).
 *
 * The gate that matters: applying requires a `ready` profile. Matching acts as
 * the gatekeeper to applying (§3.2), and it cannot gate anything without a real
 * trajectory to reason about. Letting an empty profile apply would push unfiltered
 * volume at companies — the exact mechanism that produces the 70% no-response
 * rate we exist to fix (§3.1).
 *
 * Free of database and Worker imports so it stays unit-testable.
 */

export type RemoteType = (typeof remoteTypeEnum.enumValues)[number];

export type OnboardingStep =
  /** Signed up, no profile row yet. */
  | "profile_basics"
  /** Basics done; needs at least one role in their history. */
  | "trajectory"
  /** History done; needs the preferences that drive hard filters. */
  | "preferences"
  | "ready";

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  "profile_basics",
  "trajectory",
  "preferences",
  "ready",
];

/**
 * Requirements, each tied to why it exists.
 *
 * Nothing is required for its own sake: every entry either feeds the embedding
 * (§6.2 step 2) or a hard SQL filter (§6.2 step 1). Anything that feeds neither
 * is optional, however nice it would be to have.
 */
export const REQUIREMENT_REASONS = {
  roleFamilies: "Needed to filter roles — without it every search matches everything",
  seniority: "Needed to filter roles by level",
  trajectory: "Your history is what matching reasons about, not your skill list",
  timezone: "Needed to filter roles by overlap with the team",
  openTo: "Needed to filter remote, hybrid and onsite roles",
} as const;

export type Requirement = keyof typeof REQUIREMENT_REASONS;

export type CandidateProfileState = {
  exists: boolean;
  roleFamilies?: readonly RoleFamily[] | null;
  seniority?: Seniority | null;
  timezone?: string | null;
  openTo?: RemoteType | null;
  /** Confirmed history only — an unconfirmed parse does not count (§6.2). */
  confirmedExperienceCount: number;
  /** Optional, but it improves ranking. */
  yearsExperience?: number | null;
  techStack?: readonly string[] | null;
  preferredStages?: readonly StartupStage[] | null;
  resumeUploaded?: boolean;
  resumeParsedPendingConfirmation?: boolean;
};

export type OnboardingStatus = {
  step: OnboardingStep;
  missing: Requirement[];
  /** 0–1, for a progress indicator. */
  completeness: number;
  canApply: boolean;
  /** Present when a parse is waiting for the candidate to accept or correct it. */
  awaitingResumeConfirmation: boolean;
};

const REQUIREMENT_STEP: Record<Requirement, Exclude<OnboardingStep, "ready">> = {
  roleFamilies: "profile_basics",
  seniority: "profile_basics",
  trajectory: "trajectory",
  timezone: "preferences",
  openTo: "preferences",
};

export const missingRequirements = (profile: CandidateProfileState): Requirement[] => {
  if (!profile.exists) {
    return Object.keys(REQUIREMENT_REASONS) as Requirement[];
  }

  const missing: Requirement[] = [];

  if (!profile.roleFamilies || profile.roleFamilies.length === 0) {
    missing.push("roleFamilies");
  }
  if (!profile.seniority) {
    missing.push("seniority");
  }
  if (profile.confirmedExperienceCount < 1) {
    missing.push("trajectory");
  }
  if (!profile.timezone) {
    missing.push("timezone");
  }
  if (!profile.openTo) {
    missing.push("openTo");
  }

  return missing;
};

export const onboardingStatus = (profile: CandidateProfileState): OnboardingStatus => {
  const missing = missingRequirements(profile);
  const total = Object.keys(REQUIREMENT_REASONS).length;

  // The step is the earliest one with anything outstanding, so a candidate who
  // filled preferences but skipped their history is sent back to the history.
  const step: OnboardingStep =
    missing.length === 0
      ? "ready"
      : (ONBOARDING_STEPS.filter((candidate): candidate is Exclude<OnboardingStep, "ready"> =>
          missing.some((requirement) => REQUIREMENT_STEP[requirement] === candidate),
        )[0] ?? "ready");

  return {
    step,
    missing,
    completeness: (total - missing.length) / total,
    canApply: missing.length === 0,
    awaitingResumeConfirmation: Boolean(profile.resumeParsedPendingConfirmation),
  };
};

/**
 * Whether the candidate may submit an application.
 *
 * Separate from `onboardingStatus` so the reason for refusal can be surfaced:
 * "complete your profile" with a specific list beats a disabled button.
 */
export const applicationEligibility = (
  profile: CandidateProfileState,
): { allowed: boolean; missing: Requirement[]; reasons: string[] } => {
  const missing = missingRequirements(profile);

  return {
    allowed: missing.length === 0,
    missing,
    reasons: missing.map((requirement) => REQUIREMENT_REASONS[requirement]),
  };
};

/**
 * Whether the matching embedding can be built yet.
 *
 * Stricter than `canApply` on purpose: an embedding built from role family and
 * seniority alone degenerates into the tag matching we criticise (§1.2). Without
 * a trajectory there is nothing worth vectorizing, so we would rather have no
 * vector than a misleading one.
 */
export const canBuildEmbedding = (profile: CandidateProfileState): boolean =>
  profile.exists && profile.confirmedExperienceCount >= 1;
