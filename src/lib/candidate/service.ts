import { and, eq, isNotNull, sql } from "drizzle-orm";

import type { Database } from "@/db/index";
import { candidateExperience, candidateProfile } from "@/db/schema";
import {
  onboardingStatus,
  type CandidateProfileState,
  type OnboardingStatus,
} from "@/lib/candidate/onboarding";
import type { RoleFamily, Seniority, StartupStage } from "@/lib/matching/canonical";
import type { RemoteType } from "@/lib/job/publishRequirements";

/**
 * The candidate profile as a process (docs/PRODUCT_PLAN.md §6.2).
 *
 * Services take `db` explicitly so they stay integration-testable without a
 * Worker, matching the company side.
 */

const newId = () => crypto.randomUUID();

export type ProfileInput = {
  headline?: string | null;
  bio?: string | null;
  yearsExperience?: number | null;
  roleFamilies?: RoleFamily[] | null;
  seniority?: Seniority | null;
  techStack?: string[] | null;
  timezone?: string | null;
  locations?: string[] | null;
  needsVisa?: boolean | null;
  openTo?: RemoteType | null;
  salaryExpectationMin?: number | null;
  preferredStages?: StartupStage[] | null;
};

export const getProfile = async (db: Database, userId: string) =>
  db.query.candidateProfile.findFirst({ where: eq(candidateProfile.userId, userId) });

export const listExperience = async (db: Database, userId: string) =>
  db
    .select()
    .from(candidateExperience)
    .where(eq(candidateExperience.userId, userId))
    .orderBy(sql`${candidateExperience.startedAt} DESC NULLS LAST`);

/**
 * Creates or updates the profile.
 *
 * Fields absent from the input are left alone rather than nulled, so a partial
 * save from one step of onboarding cannot wipe another step's answers.
 */
export const saveProfile = async (
  db: Database,
  userId: string,
  input: ProfileInput,
): Promise<void> => {
  const existing = await getProfile(db, userId);

  const merged = {
    headline: "headline" in input ? (input.headline ?? null) : (existing?.headline ?? null),
    bio: "bio" in input ? (input.bio ?? null) : (existing?.bio ?? null),
    yearsExperience:
      "yearsExperience" in input
        ? (input.yearsExperience ?? null)
        : (existing?.yearsExperience ?? null),
    roleFamilies:
      "roleFamilies" in input
        ? (input.roleFamilies ?? null)
        : (existing?.roleFamilies ?? null),
    seniority: "seniority" in input ? (input.seniority ?? null) : (existing?.seniority ?? null),
    techStack: "techStack" in input ? (input.techStack ?? null) : (existing?.techStack ?? null),
    timezone: "timezone" in input ? (input.timezone ?? null) : (existing?.timezone ?? null),
    locations: "locations" in input ? (input.locations ?? null) : (existing?.locations ?? null),
    needsVisa: "needsVisa" in input ? (input.needsVisa ?? null) : (existing?.needsVisa ?? null),
    openTo: "openTo" in input ? (input.openTo ?? null) : (existing?.openTo ?? null),
    salaryExpectationMin:
      "salaryExpectationMin" in input
        ? (input.salaryExpectationMin ?? null)
        : (existing?.salaryExpectationMin ?? null),
    preferredStages:
      "preferredStages" in input
        ? (input.preferredStages ?? null)
        : (existing?.preferredStages ?? null),
  };

  if (existing) {
    await db
      .update(candidateProfile)
      .set(merged)
      .where(eq(candidateProfile.userId, userId));
  } else {
    await db.insert(candidateProfile).values({ userId, ...merged });
  }
};

export type ExperienceInput = {
  companyName: string;
  title: string;
  companyStageAtJoin?: StartupStage | null;
  teamSizeAtJoin?: number | null;
  startedAt?: string | null;
  endedAt?: string | null;
  wasFirstInFunction?: boolean | null;
};

/**
 * Adds a role to the candidate's history.
 *
 * Entered by hand, so it is confirmed on arrival. A parsed entry is a proposal
 * and stays unconfirmed until the candidate accepts it (§6.2), and only
 * confirmed history feeds matching.
 */
export const addExperience = async (
  db: Database,
  userId: string,
  input: ExperienceInput,
): Promise<{ id: string }> => {
  if (input.companyName.trim().length === 0 || input.title.trim().length === 0) {
    throw new Error("Company and title are required");
  }

  const id = newId();

  await db.insert(candidateExperience).values({
    id,
    userId,
    companyName: input.companyName.trim(),
    title: input.title.trim(),
    companyStageAtJoin: input.companyStageAtJoin ?? null,
    teamSizeAtJoin: input.teamSizeAtJoin ?? null,
    startedAt: input.startedAt ?? null,
    endedAt: input.endedAt ?? null,
    wasFirstInFunction: input.wasFirstInFunction ?? null,
    source: "candidate",
    confirmedAt: new Date(),
  });

  return { id };
};

export const removeExperience = async (
  db: Database,
  userId: string,
  experienceId: string,
): Promise<void> => {
  await db
    .delete(candidateExperience)
    .where(
      and(eq(candidateExperience.id, experienceId), eq(candidateExperience.userId, userId)),
    );
};

/** Accepts a parsed entry, moving it from proposal to confirmed history. */
export const confirmExperience = async (
  db: Database,
  userId: string,
  experienceId: string,
): Promise<void> => {
  await db
    .update(candidateExperience)
    .set({ confirmedAt: new Date() })
    .where(
      and(eq(candidateExperience.id, experienceId), eq(candidateExperience.userId, userId)),
    );
};

/** Profile plus onboarding state, which is what every candidate screen needs. */
export const getProfileStatus = async (
  db: Database,
  userId: string,
): Promise<{
  profile: Awaited<ReturnType<typeof getProfile>> | null;
  experience: Awaited<ReturnType<typeof listExperience>>;
  status: OnboardingStatus;
}> => {
  const [profile, experience] = await Promise.all([
    getProfile(db, userId),
    listExperience(db, userId),
  ]);

  const confirmed = await db
    .select({ id: candidateExperience.id })
    .from(candidateExperience)
    .where(
      and(
        eq(candidateExperience.userId, userId),
        isNotNull(candidateExperience.confirmedAt),
      ),
    );

  const state: CandidateProfileState = {
    exists: Boolean(profile),
    roleFamilies: profile?.roleFamilies ?? null,
    seniority: profile?.seniority ?? null,
    timezone: profile?.timezone ?? null,
    openTo: profile?.openTo ?? null,
    confirmedExperienceCount: confirmed.length,
    yearsExperience: profile?.yearsExperience ?? null,
    techStack: profile?.techStack ?? null,
    preferredStages: profile?.preferredStages ?? null,
    resumeUploaded: Boolean(profile?.resumeR2Key),
    resumeParsedPendingConfirmation: Boolean(
      profile?.resumeParsedAt && !profile.resumeConfirmedAt,
    ),
  };

  return { profile: profile ?? null, experience, status: onboardingStatus(state) };
};
