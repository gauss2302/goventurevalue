import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { company, companyMember } from "@/db/schema";
import { withRequestContext } from "@/lib/server/context";
import { canCompanyPublish, requireCapability } from "@/lib/company/context";
import {
  acceptSla,
  createCompany,
  inviteMember,
  listMembers,
  setSlaContact,
  verifyCompanyDomain,
} from "@/lib/company/service";
import {
  archiveRole,
  createRole,
  listRoles,
  publishRole,
} from "@/lib/job/service";
import {
  changeApplicationStatus,
  companySlaDashboard,
  getApplicationThread,
  listInbox,
  respondToApplication,
} from "@/lib/application/service";
import { roleFamilyEnum, seniorityEnum, remoteTypeEnum, companyRoleEnum, applicationStatusEnum } from "@/db/schema";

/**
 * Server functions for the company product.
 *
 * Thin by design: every one of these resolves the request context and delegates
 * to a service. Business rules live in the services so they stay testable against
 * a real database without a Worker (see src/lib/company/company.integration.test.ts).
 */

const validate =
  <S extends z.ZodType>(schema: S) =>
  (data: unknown): z.infer<S> =>
    schema.parse(data);

// ---------------------------------------------------------------------------
// Companies the signed-in user can act for
// ---------------------------------------------------------------------------

export const listMyCompanies = createServerFn({ method: "GET" }).handler(async () =>
  withRequestContext(async ({ db, actor }) => {
    if (actor.memberships.length === 0) {
      return [];
    }

    const rows = await db
      .select({
        id: company.id,
        name: company.name,
        slug: company.slug,
        lifecycle: company.lifecycle,
        domainVerifiedAt: company.domainVerifiedAt,
        slaAcceptedAt: company.slaAcceptedAt,
        suspendedForSlaAt: company.suspendedForSlaAt,
      })
      .from(company)
      .where(
        inArray(
          company.id,
          actor.memberships.map((m) => m.companyId),
        ),
      );

    return rows.map((row) => {
      const membership = actor.memberships.find((m) => m.companyId === row.id)!;
      return {
        ...row,
        role: membership.role,
        publishable: canCompanyPublish(row).allowed,
      };
    });
  }),
);

export const createCompanyFn = createServerFn({ method: "POST" })
  .inputValidator(
    validate(
      z.object({
        name: z.string().min(1).max(200),
        domain: z.string().max(200).optional().nullable(),
        website: z.string().max(300).optional().nullable(),
        description: z.string().max(2000).optional().nullable(),
      }),
    ),
  )
  .handler(async ({ data }) =>
    withRequestContext(({ db, actor }) => createCompany(db, actor, data)),
  );

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

/**
 * Everything the onboarding checklist needs, in one round trip.
 *
 * Returns the blocking reason rather than a bare boolean: "cannot publish" with
 * no explanation is the kind of dead end that makes people email support.
 */
export const getCompanyOverview = createServerFn({ method: "GET" })
  .inputValidator(validate(z.object({ companyId: z.string() })))
  .handler(async ({ data }) =>
    withRequestContext(async ({ db, actor }) => {
      const membership = requireCapability(actor, data.companyId, "viewCompany");

      const row = await db.query.company.findFirst({
        where: eq(company.id, data.companyId),
      });

      if (!row) {
        throw new Error("Company not found");
      }

      const publish = canCompanyPublish(row);
      const dashboard = await companySlaDashboard(db, actor, data.companyId);

      const memberCount = await db
        .select({ id: companyMember.id })
        .from(companyMember)
        .where(
          and(
            eq(companyMember.companyId, data.companyId),
            isNull(companyMember.removedAt),
          ),
        );

      return {
        company: {
          id: row.id,
          name: row.name,
          slug: row.slug,
          domain: row.domain,
          website: row.website,
          description: row.description,
          lifecycle: row.lifecycle,
          domainVerifiedAt: row.domainVerifiedAt,
          slaAcceptedAt: row.slaAcceptedAt,
          slaResponseDays: row.slaResponseDays,
          slaTermsVersion: row.slaTermsVersion,
          suspendedForSlaAt: row.suspendedForSlaAt,
          responseRate30d: row.responseRate30d,
          medianFirstResponseHours: row.medianFirstResponseHours,
        },
        role: membership.role,
        publishable: publish.allowed,
        blockedReason: publish.allowed ? null : (publish.reason ?? null),
        memberCount: memberCount.length,
        dashboard,
      };
    }),
  );

export const verifyDomainFn = createServerFn({ method: "POST" })
  .inputValidator(
    validate(z.object({ companyId: z.string(), workEmail: z.string().email() })),
  )
  .handler(async ({ data }) =>
    withRequestContext(({ db, actor }) => verifyCompanyDomain(db, actor, data)),
  );

export const acceptSlaFn = createServerFn({ method: "POST" })
  .inputValidator(
    validate(
      z.object({
        companyId: z.string(),
        responseDays: z.number().int().min(1).max(30).optional(),
      }),
    ),
  )
  .handler(async ({ data }) =>
    withRequestContext(({ db, actor }) => acceptSla(db, actor, data)),
  );

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const listRolesFn = createServerFn({ method: "GET" })
  .inputValidator(
    validate(z.object({ companyId: z.string(), includeArchived: z.boolean().optional() })),
  )
  .handler(async ({ data }) =>
    withRequestContext(({ db, actor }) =>
      listRoles(db, actor, data.companyId, { includeArchived: data.includeArchived }),
    ),
  );

export const createRoleFn = createServerFn({ method: "POST" })
  .inputValidator(
    validate(
      z.object({
        companyId: z.string(),
        title: z.string().min(1).max(200),
        descriptionMd: z.string().max(20_000).optional().nullable(),
        roleFamily: z.enum(roleFamilyEnum.enumValues).optional().nullable(),
        seniority: z.enum(seniorityEnum.enumValues).optional().nullable(),
        remoteType: z.enum(remoteTypeEnum.enumValues).optional().nullable(),
        salaryMin: z.number().int().min(0).optional().nullable(),
        salaryMax: z.number().int().min(0).optional().nullable(),
        salaryCurrency: z.string().max(8).optional().nullable(),
        salaryIsPublic: z.boolean().optional(),
        techStack: z.array(z.string().max(60)).max(40).optional().nullable(),
        timezones: z.array(z.string().max(60)).max(20).optional().nullable(),
        locations: z.array(z.string().max(80)).max(20).optional().nullable(),
        visaSponsorship: z.boolean().optional().nullable(),
      }),
    ),
  )
  .handler(async ({ data }) =>
    withRequestContext(({ db, actor }) => {
      const { companyId, ...role } = data;
      return createRole(db, actor, companyId, role);
    }),
  );

export const publishRoleFn = createServerFn({ method: "POST" })
  .inputValidator(validate(z.object({ jobId: z.string() })))
  .handler(async ({ data }) =>
    withRequestContext(({ db, actor }) => publishRole(db, actor, data.jobId)),
  );

export const archiveRoleFn = createServerFn({ method: "POST" })
  .inputValidator(validate(z.object({ jobId: z.string() })))
  .handler(async ({ data }) =>
    withRequestContext(({ db, actor }) => archiveRole(db, actor, data.jobId)),
  );

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

export const listInboxFn = createServerFn({ method: "GET" })
  .inputValidator(
    validate(
      z.object({
        companyId: z.string(),
        jobId: z.string().optional(),
        onlyPending: z.boolean().optional(),
      }),
    ),
  )
  .handler(async ({ data }) =>
    withRequestContext(({ db, actor }) =>
      listInbox(db, actor, data.companyId, {
        jobId: data.jobId,
        slaStates: data.onlyPending ? ["pending"] : undefined,
      }),
    ),
  );

export const getThreadFn = createServerFn({ method: "GET" })
  .inputValidator(validate(z.object({ applicationId: z.string() })))
  .handler(async ({ data }) =>
    withRequestContext(({ db, actor }) =>
      getApplicationThread(db, actor, data.applicationId),
    ),
  );

export const respondFn = createServerFn({ method: "POST" })
  .inputValidator(
    validate(
      z.object({
        applicationId: z.string(),
        body: z.string().min(1).max(10_000),
        decision: z.boolean().optional(),
        toStatus: z.enum(applicationStatusEnum.enumValues).optional(),
      }),
    ),
  )
  .handler(async ({ data }) =>
    withRequestContext(({ db, actor }) => respondToApplication(db, actor, data)),
  );

export const changeStatusFn = createServerFn({ method: "POST" })
  .inputValidator(
    validate(
      z.object({
        applicationId: z.string(),
        toStatus: z.enum(applicationStatusEnum.enumValues),
      }),
    ),
  )
  .handler(async ({ data }) =>
    withRequestContext(({ db, actor }) => changeApplicationStatus(db, actor, data)),
  );

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

export const listMembersFn = createServerFn({ method: "GET" })
  .inputValidator(validate(z.object({ companyId: z.string() })))
  .handler(async ({ data }) =>
    withRequestContext(({ db, actor }) => listMembers(db, actor, data.companyId)),
  );

export const inviteMemberFn = createServerFn({ method: "POST" })
  .inputValidator(
    validate(
      z.object({
        companyId: z.string(),
        email: z.string().email(),
        role: z.enum(companyRoleEnum.enumValues),
      }),
    ),
  )
  .handler(async ({ data }) =>
    withRequestContext(({ db, actor }) => inviteMember(db, actor, data)),
  );

export const setSlaContactFn = createServerFn({ method: "POST" })
  .inputValidator(validate(z.object({ companyId: z.string(), memberId: z.string() })))
  .handler(async ({ data }) =>
    withRequestContext(({ db, actor }) => setSlaContact(db, actor, data)),
  );
