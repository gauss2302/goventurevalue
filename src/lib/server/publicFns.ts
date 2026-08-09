import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { withDb } from "@/db/index";
import { company, companyEstimate, companyFunding, companySignal, job } from "@/db/schema";
import {
  buildCompanySignals,
  buildResponseRecord,
  type CompanySignals,
  type ResponseRecord,
} from "@/lib/company/publicProfile";
import { canCompanyPublish, requireCapability } from "@/lib/company/context";
import { withRequestContext } from "@/lib/server/context";

/**
 * What candidates can see (docs/PRODUCT_PLAN.md §3.3).
 *
 * These are the only unauthenticated data paths in the product, so the rule they
 * enforce matters: a role is visible exactly when it is published *and* its
 * company may publish. Nothing here can surface a draft, an archived role, or a
 * company that has not accepted the response commitment.
 *
 * The company preview returns the same shape from the same builders, so what a
 * company sees before publishing is what a candidate gets afterwards. Two
 * renderers would drift, and a preview that drifts is a preview that lies.
 */

const validate =
  <S extends z.ZodType>(schema: S) =>
  (data: unknown): z.infer<S> =>
    schema.parse(data);

export type PublicCompany = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  website: string | null;
  hqLocation: string | null;
  stage: string;
  foundedYear: number | null;
  logoR2Key: string | null;
};

export type PublicRole = {
  id: string;
  title: string;
  descriptionMd: string | null;
  roleFamily: string | null;
  seniority: string | null;
  remoteType: string | null;
  locations: string[] | null;
  timezones: string[] | null;
  techStack: string[] | null;
  visaSponsorship: boolean | null;
  salaryIsPublic: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  publishedAt: Date | null;
  lastVerifiedAt: Date;
};

export type RoleView = {
  role: PublicRole;
  company: PublicCompany;
  signals: CompanySignals;
  responseRecord: ResponseRecord;
  /** True when rendered from the company's own preview rather than the board. */
  preview: boolean;
};

const toPublicCompany = (row: typeof company.$inferSelect): PublicCompany => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  description: row.description,
  website: row.website,
  hqLocation: row.hqLocation,
  stage: row.stage,
  foundedYear: row.foundedYear,
  logoR2Key: row.logoR2Key,
});

const toPublicRole = (row: typeof job.$inferSelect): PublicRole => ({
  id: row.id,
  title: row.title,
  descriptionMd: row.descriptionMd,
  roleFamily: row.roleFamily,
  seniority: row.seniority,
  remoteType: row.remoteType,
  locations: row.locations,
  timezones: row.timezones,
  techStack: row.techStack,
  visaSponsorship: row.visaSponsorship,
  salaryIsPublic: row.salaryIsPublic,
  salaryMin: row.salaryMin,
  salaryMax: row.salaryMax,
  salaryCurrency: row.salaryCurrency,
  publishedAt: row.publishedAt,
  lastVerifiedAt: row.lastVerifiedAt,
});

/** Loads the inputs the signal builders need. Shared by public and preview. */
const loadSignalInputs = async (
  db: Parameters<Parameters<typeof withDb>[0]>[0],
  companyRow: typeof company.$inferSelect,
) => {
  const [signalRow, estimates, funding] = await Promise.all([
    db.query.companySignal.findFirst({ where: eq(companySignal.companyId, companyRow.id) }),
    db.select().from(companyEstimate).where(eq(companyEstimate.companyId, companyRow.id)),
    db
      .select({
        amountUsd: companyFunding.amountUsd,
        announcedAt: companyFunding.announcedAt,
      })
      .from(companyFunding)
      .where(eq(companyFunding.companyId, companyRow.id))
      .orderBy(desc(companyFunding.announcedAt))
      .limit(1),
  ]);

  const lastFunding = funding[0]
    ? {
        amountUsd: funding[0].amountUsd === null ? null : Number(funding[0].amountUsd),
        announcedAt: funding[0].announcedAt ? new Date(funding[0].announcedAt) : null,
      }
    : null;

  return {
    signals: buildCompanySignals({
      company: companyRow,
      signal: signalRow ?? null,
      estimates,
      lastFunding,
    }),
    responseRecord: buildResponseRecord(companyRow),
  };
};

export const getPublicRole = createServerFn({ method: "GET" })
  .inputValidator(validate(z.object({ jobId: z.string() })))
  .handler(async ({ data }) =>
    withDb(async (db): Promise<RoleView | null> => {
      const rows = await db
        .select({ job, company })
        .from(job)
        .innerJoin(company, eq(company.id, job.companyId))
        .where(and(eq(job.id, data.jobId), eq(job.status, "published")))
        .limit(1);

      if (rows.length === 0) {
        return null;
      }

      const { job: roleRow, company: companyRow } = rows[0];

      // Belt and braces: a role should never be published under a company that
      // cannot publish, but if the two ever disagree the candidate-facing side
      // is the one that must fail closed.
      if (!canCompanyPublish(companyRow).allowed) {
        return null;
      }

      const { signals, responseRecord } = await loadSignalInputs(db, companyRow);

      return {
        role: toPublicRole(roleRow),
        company: toPublicCompany(companyRow),
        signals,
        responseRecord,
        preview: false,
      };
    }),
  );

export type CompanyView = {
  company: PublicCompany;
  signals: CompanySignals;
  responseRecord: ResponseRecord;
  roles: Array<
    Pick<
      PublicRole,
      | "id"
      | "title"
      | "roleFamily"
      | "seniority"
      | "remoteType"
      | "salaryIsPublic"
      | "salaryMin"
      | "salaryMax"
      | "salaryCurrency"
      | "lastVerifiedAt"
    >
  >;
};

export const getPublicCompany = createServerFn({ method: "GET" })
  .inputValidator(validate(z.object({ slug: z.string() })))
  .handler(async ({ data }) =>
    withDb(async (db): Promise<CompanyView | null> => {
      const companyRow = await db.query.company.findFirst({
        where: eq(company.slug, data.slug),
      });

      if (!companyRow || !canCompanyPublish(companyRow).allowed) {
        return null;
      }

      const [{ signals, responseRecord }, roles] = await Promise.all([
        loadSignalInputs(db, companyRow),
        db
          .select({
            id: job.id,
            title: job.title,
            roleFamily: job.roleFamily,
            seniority: job.seniority,
            remoteType: job.remoteType,
            salaryIsPublic: job.salaryIsPublic,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            salaryCurrency: job.salaryCurrency,
            lastVerifiedAt: job.lastVerifiedAt,
          })
          .from(job)
          .where(and(eq(job.companyId, companyRow.id), eq(job.status, "published")))
          .orderBy(desc(job.publishedAt)),
      ]);

      return { company: toPublicCompany(companyRow), signals, responseRecord, roles };
    }),
  );

/**
 * The same view, for a company looking at its own unpublished role.
 *
 * Authenticated and capability-checked, but otherwise identical — that identity
 * is the point.
 */
export const previewRole = createServerFn({ method: "GET" })
  .inputValidator(validate(z.object({ jobId: z.string() })))
  .handler(async ({ data }) =>
    withRequestContext(async ({ db, actor }): Promise<RoleView | null> => {
      const rows = await db
        .select({ job, company })
        .from(job)
        .innerJoin(company, eq(company.id, job.companyId))
        .where(eq(job.id, data.jobId))
        .limit(1);

      if (rows.length === 0) {
        return null;
      }

      const { job: roleRow, company: companyRow } = rows[0];
      requireCapability(actor, companyRow.id, "viewCompany");

      const { signals, responseRecord } = await loadSignalInputs(db, companyRow);

      return {
        role: toPublicRole(roleRow),
        company: toPublicCompany(companyRow),
        signals,
        responseRecord,
        preview: true,
      };
    }),
  );

/** Published roles across every company that may publish — the board. */
export const listPublicRoles = createServerFn({ method: "GET" }).handler(async () =>
  withDb(async (db) => {
    const rows = await db
      .select({
        id: job.id,
        title: job.title,
        roleFamily: job.roleFamily,
        seniority: job.seniority,
        remoteType: job.remoteType,
        salaryIsPublic: job.salaryIsPublic,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.salaryCurrency,
        publishedAt: job.publishedAt,
        companyName: company.name,
        companySlug: company.slug,
        companyStage: company.stage,
        responseRate30d: company.responseRate30d,
        slaResponseDays: company.slaResponseDays,
      })
      .from(job)
      .innerJoin(company, eq(company.id, job.companyId))
      .where(
        and(
          eq(job.status, "published"),
          eq(company.lifecycle, "onboarded"),
          isNotNull(company.slaAcceptedAt),
          isNotNull(company.domainVerifiedAt),
        ),
      )
      .orderBy(desc(job.publishedAt))
      .limit(100);

    return rows;
  }),
);
