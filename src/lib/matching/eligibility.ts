import type { RoleFamily, Seniority, StartupStage } from "@/lib/matching/canonical";
import type { RemoteType } from "@/lib/job/publishRequirements";

/**
 * Whether a candidate and a role are a meaningful enough match to apply
 * (docs/PRODUCT_PLAN.md §3.2, §6.2).
 *
 * Matching is a gatekeeper here, not a recommendation engine. The response
 * promise only survives if the volume reaching a company is answerable, and
 * unfiltered volume is precisely what produces the 70% no-reply rate the product
 * exists to fix (§3.1).
 *
 * Two rules shape everything below:
 *
 *  - **Hard constraints are absolute.** Timezone, visa and salary are facts, not
 *    preferences to be softened. A vector that "sort of" respects a visa
 *    requirement produces confident wrong matches, which is why these never
 *    reach the embedding (§6.2) and are resolved here instead.
 *
 *  - **A refusal must explain itself.** A disabled button with no reason is a
 *    dead end that makes people email support, and it hides whether the fault is
 *    theirs or ours.
 *
 * Free of database and Worker imports so it stays unit-testable.
 */

const SENIORITY_ORDER: Seniority[] = ["junior", "mid", "senior", "staff", "principal", "lead"];

/**
 * How far apart two levels may be and still be worth an application.
 *
 * One step. A senior applying to a staff role is a normal stretch; a junior
 * applying to a principal role wastes both sides' time, and the company pays for
 * that in an obligation to reply.
 */
const MAX_SENIORITY_DISTANCE = 1;

export const seniorityDistance = (a: Seniority, b: Seniority): number =>
  Math.abs(SENIORITY_ORDER.indexOf(a) - SENIORITY_ORDER.indexOf(b));

export type CandidateConstraints = {
  roleFamilies: readonly RoleFamily[];
  seniority: Seniority | null;
  timezone: string | null;
  openTo: RemoteType | null;
  needsVisa: boolean | null;
  salaryExpectationMin: number | null;
  preferredStages: readonly StartupStage[] | null;
  techStack: readonly string[] | null;
};

export type RoleConstraints = {
  roleFamily: RoleFamily | null;
  seniority: Seniority | null;
  remoteType: RemoteType | null;
  visaSponsorship: boolean | null;
  salaryIsPublic: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  techStack: readonly string[] | null;
  companyStage: StartupStage | null;
};

export type Blocker =
  | "role_family"
  | "seniority"
  | "remote"
  | "visa"
  | "salary";

export const BLOCKER_REASONS: Record<Blocker, string> = {
  role_family: "This role is in a different function to the ones on your profile",
  seniority: "This role is more than one level away from yours",
  remote: "This role's working arrangement does not match what you are open to",
  visa: "This role does not sponsor visas and your profile says you need one",
  salary: "This role's published range is below your stated minimum",
};

export type Eligibility = {
  allowed: boolean;
  blockers: Blocker[];
  reasons: string[];
};

/**
 * Applies the hard constraints.
 *
 * Unknowns never block. A role that has not said whether it sponsors visas has
 * not said no, and refusing on a value the company never gave would repeat the
 * mistake the honesty contract exists to prevent (§6.4 rule 2). The same holds
 * for a withheld salary band: silence is not a low number.
 */
export const checkEligibility = (
  candidate: CandidateConstraints,
  role: RoleConstraints,
): Eligibility => {
  const blockers: Blocker[] = [];

  if (
    role.roleFamily &&
    candidate.roleFamilies.length > 0 &&
    !candidate.roleFamilies.includes(role.roleFamily)
  ) {
    blockers.push("role_family");
  }

  if (
    role.seniority &&
    candidate.seniority &&
    seniorityDistance(candidate.seniority, role.seniority) > MAX_SENIORITY_DISTANCE
  ) {
    blockers.push("seniority");
  }

  // Someone open to onsite is implicitly fine with remote; the reverse is not.
  if (role.remoteType && candidate.openTo) {
    const remoteOk =
      role.remoteType === candidate.openTo ||
      (candidate.openTo === "onsite" && role.remoteType !== "onsite") ||
      (candidate.openTo === "hybrid" && role.remoteType === "remote");

    if (!remoteOk) {
      blockers.push("remote");
    }
  }

  // Only an explicit "we do not sponsor" blocks — silence does not.
  if (candidate.needsVisa === true && role.visaSponsorship === false) {
    blockers.push("visa");
  }

  // Only a published band can fall short. A withheld one says nothing.
  if (
    candidate.salaryExpectationMin !== null &&
    role.salaryIsPublic &&
    role.salaryMax !== null &&
    role.salaryMax < candidate.salaryExpectationMin
  ) {
    blockers.push("salary");
  }

  return {
    allowed: blockers.length === 0,
    blockers,
    reasons: blockers.map((blocker) => BLOCKER_REASONS[blocker]),
  };
};

// ---------------------------------------------------------------------------
// Ranking and explainability
// ---------------------------------------------------------------------------

export type MatchReason = {
  kind: "role_family" | "seniority" | "tech" | "stage" | "salary";
  text: string;
};

export type MatchScore = {
  /** 0–1. Structural only for now; the vector stage slots in ahead of this. */
  score: number;
  reasons: MatchReason[];
};

const overlap = (a: readonly string[] | null, b: readonly string[] | null): string[] => {
  if (!a?.length || !b?.length) return [];
  const set = new Set(b.map((item) => item.trim().toLowerCase()));
  return a.filter((item) => set.has(item.trim().toLowerCase()));
};

/**
 * Ranks an eligible role and says why it surfaced.
 *
 * Deliberately structural and deterministic. The semantic stage (§6.2 step 2)
 * needs embeddings from the Workers AI binding, which is not wired yet; this is
 * the layer that runs before and after it, and the explanations it produces are
 * built from facts we can point at rather than from a model's assertion —
 * a recommendation nobody can check is one nobody trusts (§1.4 ③).
 */
export const scoreMatch = (
  candidate: CandidateConstraints,
  role: RoleConstraints,
): MatchScore => {
  const reasons: MatchReason[] = [];
  let score = 0;

  if (role.roleFamily && candidate.roleFamilies.includes(role.roleFamily)) {
    score += 0.35;
    reasons.push({
      kind: "role_family",
      text: `You work in ${role.roleFamily.replace(/_/g, " ")}`,
    });
  }

  if (role.seniority && candidate.seniority) {
    const distance = seniorityDistance(candidate.seniority, role.seniority);
    if (distance === 0) {
      score += 0.25;
      reasons.push({ kind: "seniority", text: `Exactly your level (${role.seniority})` });
    } else if (distance === 1) {
      score += 0.12;
      reasons.push({ kind: "seniority", text: `One level from yours (${role.seniority})` });
    }
  }

  const sharedTech = overlap(candidate.techStack, role.techStack);
  if (sharedTech.length > 0) {
    score += Math.min(0.25, sharedTech.length * 0.08);
    reasons.push({
      kind: "tech",
      text: `Shared technologies: ${sharedTech.slice(0, 4).join(", ")}`,
    });
  }

  if (
    role.companyStage &&
    role.companyStage !== "unknown" &&
    candidate.preferredStages?.includes(role.companyStage)
  ) {
    score += 0.15;
    reasons.push({
      kind: "stage",
      text: `${role.companyStage.replace(/_/g, " ")} stage, which you prefer`,
    });
  }

  if (
    candidate.salaryExpectationMin !== null &&
    role.salaryIsPublic &&
    role.salaryMin !== null &&
    role.salaryMin >= candidate.salaryExpectationMin
  ) {
    score += 0.1;
    reasons.push({ kind: "salary", text: "Published range starts above your minimum" });
  }

  return { score: Math.min(1, Math.round(score * 100) / 100), reasons };
};

// ---------------------------------------------------------------------------
// Weekly application window
// ---------------------------------------------------------------------------

/**
 * Monday 00:00 UTC of the week containing `now`.
 *
 * A fixed calendar week rather than a rolling 7 days: a candidate should be able
 * to tell when their applications come back without doing arithmetic, and a
 * rolling window drips them back one at a time in a way nobody can plan around.
 */
export const currentQuotaWindow = (now: Date = new Date()): string => {
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  // getUTCDay: Sunday is 0, so Sunday belongs to the week that began six days earlier.
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);

  return date.toISOString().slice(0, 10);
};

export const nextQuotaReset = (now: Date = new Date()): Date => {
  const monday = new Date(`${currentQuotaWindow(now)}T00:00:00.000Z`);
  monday.setUTCDate(monday.getUTCDate() + 7);
  return monday;
};
