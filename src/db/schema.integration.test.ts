import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { withDb } from "@/db/index";
import {
  application,
  applicationEvent,
  company,
  companyMember,
  job,
  jobEmbedding,
  user,
} from "@/db/schema";
import { EMBEDDING_DIMENSIONS } from "@/lib/ai/workersAi";
import { computeSlaDueAt, deriveSlaVerdict } from "@/lib/application/sla";
import { SLA_RESPONSE_DAYS } from "@/config/brand";

/**
 * Integration test for the Drizzle schema against a real Postgres.
 *
 * Skipped unless DATABASE_URL is set, so the default `pnpm test` stays hermetic.
 * To run it:
 *
 *   createdb startup_jobs
 *   psql -d startup_jobs -f drizzle/0000_*.sql
 *   DATABASE_URL=postgresql://... pnpm vitest run src/db
 *
 * What it is actually for: catching drift between the TypeScript schema and the
 * generated SQL, and proving pgvector works end to end through Drizzle rather
 * than only in hand-written psql. It also exercises `withDb` and `src/lib/env.ts`
 * on their non-Worker fallback path.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);

const TEST_PREFIX = "itest-";

const unitVector = (sign: 1 | -1) => Array.from({ length: EMBEDDING_DIMENSIONS }, () => sign);

describe.skipIf(!hasDatabase)("drizzle schema against Postgres", () => {
  afterAll(async () => {
    if (!hasDatabase) return;
    await withDb(async (db) => {
      await db.delete(company).where(sql`${company.id} LIKE ${`${TEST_PREFIX}%`}`);
    });
  });

  it("round-trips a company, job and embedding", async () => {
    await withDb(async (db) => {
      await db.insert(company).values({
        id: `${TEST_PREFIX}co`,
        slug: `${TEST_PREFIX}co`,
        name: "Integration Co",
        domain: `${TEST_PREFIX}co.example`,
        lifecycle: "onboarded",
        stage: "seed",
        slaResponseDays: 7,
        slaAcceptedAt: new Date(),
      });

      await db.insert(job).values({
        id: `${TEST_PREFIX}job`,
        companyId: `${TEST_PREFIX}co`,
        title: "Senior Backend Engineer",
        roleFamily: "backend",
        seniority: "senior",
        status: "published",
        contentHash: `${TEST_PREFIX}hash`,
        publishedAt: new Date(),
      });

      await db.insert(jobEmbedding).values({
        jobId: `${TEST_PREFIX}job`,
        embedding: unitVector(1),
        model: "bge-base-en-v1.5",
      });

      const stored = await db.query.job.findFirst({
        where: eq(job.id, `${TEST_PREFIX}job`),
        with: { company: true, embedding: true },
      });

      expect(stored?.roleFamily).toBe("backend");
      expect(stored?.company.lifecycle).toBe("onboarded");
      expect(stored?.embedding?.embedding).toHaveLength(EMBEDDING_DIMENSIONS);
    });
  });

  it("ranks by cosine distance", async () => {
    await withDb(async (db) => {
      const distance = sql<number>`${jobEmbedding.embedding} <=> ${JSON.stringify(unitVector(1))}::vector`;

      const rows = await db
        .select({ jobId: jobEmbedding.jobId, distance })
        .from(jobEmbedding)
        .where(eq(jobEmbedding.jobId, `${TEST_PREFIX}job`));

      // Identical direction ⇒ zero cosine distance.
      expect(Number(rows[0]?.distance)).toBeCloseTo(0, 5);
    });
  });

  it("only exposes roles from companies that accepted the SLA", async () => {
    // The query shape the public product depends on (docs/PRODUCT_PLAN.md §3.2):
    // nothing is publishable without an accepted SLA.
    await withDb(async (db) => {
      const rows = await db
        .select({ jobId: job.id })
        .from(job)
        .innerJoin(company, eq(company.id, job.companyId))
        .where(
          and(
            eq(job.status, "published"),
            eq(company.lifecycle, "onboarded"),
            isNotNull(company.slaAcceptedAt),
          ),
        );

      expect(rows.map((row) => row.jobId)).toContain(`${TEST_PREFIX}job`);
    });
  });

  it("rejects a duplicate role from the same source", async () => {
    await withDb(async (db) => {
      await expect(
        db.insert(job).values({
          id: `${TEST_PREFIX}job`,
          companyId: `${TEST_PREFIX}co`,
          title: "Duplicate",
          status: "published",
          contentHash: `${TEST_PREFIX}hash2`,
        }),
      ).rejects.toThrow();
    });
  });
});

describe.skipIf(!hasDatabase)("company membership", () => {
  const other = `${TEST_PREFIX}co2`;

  afterAll(async () => {
    if (!hasDatabase) return;
    await withDb(async (db) => {
      await db.delete(user).where(sql`${user.id} LIKE ${`${TEST_PREFIX}%`}`);
      await db.delete(company).where(sql`${company.id} LIKE ${`${TEST_PREFIX}%`}`);
    });
  });

  it("holds several managers with different roles in one company", async () => {
    await withDb(async (db) => {
      await db.insert(company).values([
        {
          id: `${TEST_PREFIX}m-co`,
          slug: `${TEST_PREFIX}m-co`,
          name: "Members Co",
          lifecycle: "onboarded",
        },
        { id: other, slug: other, name: "Other Co", lifecycle: "onboarded" },
      ]);

      await db.insert(user).values([
        { id: `${TEST_PREFIX}u1`, name: "Ann", email: `${TEST_PREFIX}ann@x.dev` },
        { id: `${TEST_PREFIX}u2`, name: "Bo", email: `${TEST_PREFIX}bo@x.dev` },
      ]);

      await db.insert(companyMember).values([
        {
          id: `${TEST_PREFIX}m1`,
          companyId: `${TEST_PREFIX}m-co`,
          userId: `${TEST_PREFIX}u1`,
          role: "owner",
          isSlaContact: true,
        },
        {
          id: `${TEST_PREFIX}m2`,
          companyId: `${TEST_PREFIX}m-co`,
          userId: `${TEST_PREFIX}u2`,
          role: "recruiter",
        },
        // Same person, different company, different role — the fractional
        // recruiter case must be representable.
        {
          id: `${TEST_PREFIX}m3`,
          companyId: other,
          userId: `${TEST_PREFIX}u2`,
          role: "admin",
        },
      ]);

      const roles = await db
        .select({ role: companyMember.role })
        .from(companyMember)
        .where(eq(companyMember.companyId, `${TEST_PREFIX}m-co`));

      expect(roles.map((r) => r.role).sort()).toEqual(["owner", "recruiter"]);

      const memberships = await db
        .select({ companyId: companyMember.companyId, role: companyMember.role })
        .from(companyMember)
        .where(eq(companyMember.userId, `${TEST_PREFIX}u2`));

      expect(memberships).toHaveLength(2);
    });
  });

  it("permits only one SLA contact per company", async () => {
    await withDb(async (db) => {
      await expect(
        db.insert(companyMember).values({
          id: `${TEST_PREFIX}m4`,
          companyId: `${TEST_PREFIX}m-co`,
          userId: `${TEST_PREFIX}u2`,
          role: "admin",
          isSlaContact: true,
        }),
      ).rejects.toThrow();
    });
  });

  it("rejects the same user twice in one company", async () => {
    await withDb(async (db) => {
      await expect(
        db.insert(companyMember).values({
          id: `${TEST_PREFIX}m5`,
          companyId: `${TEST_PREFIX}m-co`,
          userId: `${TEST_PREFIX}u1`,
          role: "viewer",
        }),
      ).rejects.toThrow();
    });
  });
});

describe.skipIf(!hasDatabase)("SLA derivation from stored events", () => {
  const co = `${TEST_PREFIX}sla-co`;
  const appId = `${TEST_PREFIX}app`;
  const appliedAt = new Date("2026-08-01T00:00:00Z");

  afterAll(async () => {
    if (!hasDatabase) return;
    await withDb(async (db) => {
      await db.delete(company).where(sql`${company.id} LIKE ${`${TEST_PREFIX}sla%`}`);
      await db.delete(user).where(sql`${user.id} LIKE ${`${TEST_PREFIX}sla%`}`);
    });
  });

  it("does not treat an internal status change as a response", async () => {
    await withDb(async (db) => {
      await db.insert(company).values({
        id: co,
        slug: co,
        name: "SLA Co",
        lifecycle: "onboarded",
        slaResponseDays: SLA_RESPONSE_DAYS,
        slaAcceptedAt: new Date(),
      });
      await db
        .insert(user)
        .values({ id: `${TEST_PREFIX}sla-u`, name: "Cand", email: `${TEST_PREFIX}sla@x.dev` });
      await db.insert(job).values({
        id: `${TEST_PREFIX}sla-job`,
        companyId: co,
        title: "Backend",
        status: "published",
        contentHash: `${TEST_PREFIX}sla-hash`,
      });

      const slaDueAt = computeSlaDueAt(appliedAt, SLA_RESPONSE_DAYS);

      await db.insert(application).values({
        id: appId,
        jobId: `${TEST_PREFIX}sla-job`,
        userId: `${TEST_PREFIX}sla-u`,
        appliedAt,
        slaDueAt,
      });

      await db.insert(applicationEvent).values([
        {
          id: `${TEST_PREFIX}e1`,
          applicationId: appId,
          kind: "submitted",
          isCandidateVisible: false,
          occurredAt: appliedAt,
        },
        {
          id: `${TEST_PREFIX}e2`,
          applicationId: appId,
          kind: "status_changed",
          isCandidateVisible: false,
          fromStatus: "submitted",
          toStatus: "in_review",
          occurredAt: new Date("2026-08-02T00:00:00Z"),
        },
      ]);

      const events = await db
        .select({ kind: applicationEvent.kind, occurredAt: applicationEvent.occurredAt })
        .from(applicationEvent)
        .where(eq(applicationEvent.applicationId, appId));

      const verdict = deriveSlaVerdict({
        appliedAt,
        slaDueAt,
        events,
        now: new Date("2026-08-04T00:00:00Z"),
      });

      // The company reviewed the application; the candidate still heard nothing.
      expect(verdict.state).toBe("pending");
      expect(verdict.firstResponseAt).toBeNull();
    });
  });

  it("counts a message to the candidate, via the partial index", async () => {
    await withDb(async (db) => {
      const respondedAt = new Date("2026-08-03T00:00:00Z");

      await db.insert(applicationEvent).values({
        id: `${TEST_PREFIX}e3`,
        applicationId: appId,
        kind: "message_to_candidate",
        isCandidateVisible: true,
        body: "Thanks — we'd like to talk.",
        occurredAt: respondedAt,
      });

      // Exactly the query the SLA sweep runs: the index predicate is the
      // response definition, so this cannot accidentally pick up an internal event.
      const responses = await db
        .select({ occurredAt: applicationEvent.occurredAt })
        .from(applicationEvent)
        .where(
          and(
            eq(applicationEvent.applicationId, appId),
            inArray(applicationEvent.kind, ["message_to_candidate", "decision"]),
          ),
        )
        .orderBy(applicationEvent.occurredAt)
        .limit(1);

      expect(responses[0]?.occurredAt).toEqual(respondedAt);

      const events = await db
        .select({ kind: applicationEvent.kind, occurredAt: applicationEvent.occurredAt })
        .from(applicationEvent)
        .where(eq(applicationEvent.applicationId, appId));

      const verdict = deriveSlaVerdict({
        appliedAt,
        slaDueAt: computeSlaDueAt(appliedAt, SLA_RESPONSE_DAYS),
        events,
        now: new Date("2026-08-04T00:00:00Z"),
      });

      expect(verdict.state).toBe("answered");
      expect(verdict.firstResponseAt).toEqual(respondedAt);
    });
  });
});
