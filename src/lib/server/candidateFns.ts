import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { withDb } from "@/db/index";
import {
  application as applicationTable,
  candidateProfile as candidateProfileTable,
  company as companyTable,
  job as jobTable,
  remoteTypeEnum,
  roleFamilyEnum,
  seniorityEnum,
  startupStageEnum,
} from "@/db/schema";
import { checkEligibility } from "@/lib/matching/eligibility";
import type { ApplyState } from "@/components/public/ApplyPanel";
import { withRequestContext } from "@/lib/server/context";
import {
  addExperience,
  confirmExperience,
  getProfileStatus,
  removeExperience,
  saveProfile,
} from "@/lib/candidate/service";
import {
  applyToRole,
  getMyApplicationThread,
  getQuota,
  listMyApplications,
  searchRoles,
  toggleSavedJob,
  withdrawApplication,
} from "@/lib/candidate/applyService";

/**
 * Server functions for the candidate product.
 *
 * Thin like the company side: rules live in the services so they stay testable
 * against a real database without a Worker.
 */

const validate =
  <S extends z.ZodType>(schema: S) =>
  (data: unknown): z.infer<S> =>
    schema.parse(data);

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export const getMyProfile = createServerFn({ method: "GET" }).handler(async () =>
  withRequestContext(({ db, user }) => getProfileStatus(db, user.id)),
);

export const saveProfileFn = createServerFn({ method: "POST" })
  .inputValidator(
    validate(
      z.object({
        headline: z.string().max(200).optional().nullable(),
        bio: z.string().max(4000).optional().nullable(),
        yearsExperience: z.number().int().min(0).max(60).optional().nullable(),
        roleFamilies: z.array(z.enum(roleFamilyEnum.enumValues)).max(4).optional().nullable(),
        seniority: z.enum(seniorityEnum.enumValues).optional().nullable(),
        techStack: z.array(z.string().max(60)).max(40).optional().nullable(),
        timezone: z.string().max(60).optional().nullable(),
        locations: z.array(z.string().max(80)).max(20).optional().nullable(),
        needsVisa: z.boolean().optional().nullable(),
        openTo: z.enum(remoteTypeEnum.enumValues).optional().nullable(),
        salaryExpectationMin: z.number().int().min(0).optional().nullable(),
        preferredStages: z
          .array(z.enum(startupStageEnum.enumValues))
          .max(5)
          .optional()
          .nullable(),
      }),
    ),
  )
  .handler(async ({ data }) =>
    withRequestContext(({ db, user }) => saveProfile(db, user.id, data)),
  );

export const addExperienceFn = createServerFn({ method: "POST" })
  .inputValidator(
    validate(
      z.object({
        companyName: z.string().min(1).max(200),
        title: z.string().min(1).max(200),
        companyStageAtJoin: z.enum(startupStageEnum.enumValues).optional().nullable(),
        teamSizeAtJoin: z.number().int().positive().max(100_000).optional().nullable(),
        startedAt: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .nullable(),
        endedAt: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .nullable(),
        wasFirstInFunction: z.boolean().optional().nullable(),
      }),
    ),
  )
  .handler(async ({ data }) =>
    withRequestContext(({ db, user }) => addExperience(db, user.id, data)),
  );

export const removeExperienceFn = createServerFn({ method: "POST" })
  .inputValidator(validate(z.object({ experienceId: z.string() })))
  .handler(async ({ data }) =>
    withRequestContext(({ db, user }) => removeExperience(db, user.id, data.experienceId)),
  );

export const confirmExperienceFn = createServerFn({ method: "POST" })
  .inputValidator(validate(z.object({ experienceId: z.string() })))
  .handler(async ({ data }) =>
    withRequestContext(({ db, user }) => confirmExperience(db, user.id, data.experienceId)),
  );

// ---------------------------------------------------------------------------
// Search and apply
// ---------------------------------------------------------------------------

const filtersSchema = z.object({
  roleFamilies: z.array(z.string()).max(10).optional(),
  seniority: z.array(z.string()).max(10).optional(),
  remoteType: z.array(z.string()).max(3).optional(),
  minSalary: z.number().int().min(0).optional(),
  onlyEligible: z.boolean().optional(),
});

/**
 * The feed.
 *
 * Works signed out, so a visitor can see what the board holds before creating an
 * account — but without a profile there is nothing to match against, so every
 * role comes back unranked and unfiltered.
 */
export const searchRolesFn = createServerFn({ method: "GET" })
  .inputValidator(validate(filtersSchema))
  .handler(async ({ data }) => {
    try {
      return await withRequestContext(({ db, user }) => searchRoles(db, user.id, data));
    } catch {
      return withDb((db) => searchRoles(db, null, { ...data, onlyEligible: false }));
    }
  });

export const getMyQuota = createServerFn({ method: "GET" }).handler(async () =>
  withRequestContext(({ db, user }) => getQuota(db, user.id)),
);

/**
 * Whether this candidate can apply to this role, and if not, why.
 *
 * Computed server-side and in one place so the button, its explanation and the
 * eventual refusal all agree. A UI that decides for itself whether applying is
 * possible will eventually disagree with the service that enforces it.
 */
export const getApplyState = createServerFn({ method: "GET" })
  .inputValidator(validate(z.object({ jobId: z.string() })))
  .handler(async ({ data }): Promise<ApplyState> => {
    try {
      return await withRequestContext(async ({ db, user }) => {
        const [{ status }, quota, existing, roleRows] = await Promise.all([
          getProfileStatus(db, user.id),
          getQuota(db, user.id),
          db.query.application.findFirst({
            where: and(
              eq(applicationTable.jobId, data.jobId),
              eq(applicationTable.userId, user.id),
            ),
          }),
          db
            .select({ job: jobTable, company: companyTable })
            .from(jobTable)
            .innerJoin(companyTable, eq(companyTable.id, jobTable.companyId))
            .where(eq(jobTable.id, data.jobId))
            .limit(1),
        ]);

        if (existing) {
          return { state: "already_applied", applicationId: existing.id };
        }

        if (!status.canApply) {
          return { state: "profile_incomplete", missing: status.missing };
        }

        const profile = await db.query.candidateProfile.findFirst({
          where: eq(candidateProfileTable.userId, user.id),
        });

        if (profile && roleRows.length > 0) {
          const eligibility = checkEligibility(
            {
              roleFamilies: profile.roleFamilies ?? [],
              seniority: profile.seniority,
              timezone: profile.timezone,
              openTo: profile.openTo,
              needsVisa: profile.needsVisa,
              salaryExpectationMin: profile.salaryExpectationMin,
              preferredStages: profile.preferredStages,
              techStack: profile.techStack,
            },
            {
              roleFamily: roleRows[0].job.roleFamily,
              seniority: roleRows[0].job.seniority,
              remoteType: roleRows[0].job.remoteType,
              visaSponsorship: roleRows[0].job.visaSponsorship,
              salaryIsPublic: roleRows[0].job.salaryIsPublic,
              salaryMin: roleRows[0].job.salaryMin,
              salaryMax: roleRows[0].job.salaryMax,
              techStack: roleRows[0].job.techStack,
              companyStage: roleRows[0].company.stage,
            },
          );

          if (!eligibility.allowed) {
            return { state: "not_eligible", eligibility };
          }
        }

        if (quota.remaining <= 0) {
          return { state: "quota_exhausted", resetsAt: quota.resetsAt };
        }

        return { state: "ready", remaining: quota.remaining, limit: quota.limit };
      });
    } catch {
      // Not signed in — the only unauthenticated outcome.
      return { state: "signed_out" };
    }
  });

export const applyFn = createServerFn({ method: "POST" })
  .inputValidator(
    validate(
      z.object({
        jobId: z.string(),
        coverLetter: z.string().max(5000).optional().nullable(),
      }),
    ),
  )
  .handler(async ({ data }) =>
    withRequestContext(({ db, user }) => applyToRole(db, user.id, data)),
  );

export const withdrawFn = createServerFn({ method: "POST" })
  .inputValidator(validate(z.object({ applicationId: z.string() })))
  .handler(async ({ data }) =>
    withRequestContext(({ db, user }) =>
      withdrawApplication(db, user.id, data.applicationId),
    ),
  );

export const listMyApplicationsFn = createServerFn({ method: "GET" }).handler(async () =>
  withRequestContext(({ db, user }) => listMyApplications(db, user.id)),
);

export const getMyApplicationFn = createServerFn({ method: "GET" })
  .inputValidator(validate(z.object({ applicationId: z.string() })))
  .handler(async ({ data }) =>
    withRequestContext(({ db, user }) =>
      getMyApplicationThread(db, user.id, data.applicationId),
    ),
  );

export const toggleSavedJobFn = createServerFn({ method: "POST" })
  .inputValidator(validate(z.object({ jobId: z.string() })))
  .handler(async ({ data }) =>
    withRequestContext(({ db, user }) => toggleSavedJob(db, user.id, data.jobId)),
  );
