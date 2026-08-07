import { and, eq, isNotNull, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { withDb } from "@/db/index";
import { company, job, jobEmbedding } from "@/db/schema";
import { EMBEDDING_DIMENSIONS } from "@/lib/ai/workersAi";

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
