import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { withDb } from "@/db/index";
import { application, company, user } from "@/db/schema";
import { WEEKLY_APPLICATION_LIMIT } from "@/config/brand";
import { loadActor, type Actor } from "@/lib/company/context";
import { acceptSla, createCompany, verifyCompanyDomain } from "@/lib/company/service";
import { createRole, publishRole } from "@/lib/job/service";
import { MIN_DESCRIPTION_LENGTH } from "@/lib/job/publishRequirements";
import {
  addExperience,
  getProfileStatus,
  saveProfile,
} from "@/lib/candidate/service";
import {
  ApplyError,
  applyToRole,
  getQuota,
  listMyApplications,
  searchRoles,
  withdrawApplication,
} from "@/lib/candidate/applyService";
import { respondToApplication } from "@/lib/application/service";

/**
 * The candidate side end to end, and the full loop with the company side.
 *
 * The last test is the one that matters most: it is the first time an
 * application exists that a person actually submitted, so the SLA machinery is
 * finally exercised on real data rather than on rows a fixture inserted.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const P = "cnd-";
const uid = (suffix: string) => `${P}${suffix}`;

const DESCRIPTION =
  "You will own the ingestion pipeline end to end, working with the founders. ".repeat(2) +
  "x".repeat(MIN_DESCRIPTION_LENGTH);

describe.skipIf(!hasDatabase)("candidate side", () => {
  let founder: Actor;
  let companyId: string;
  let jobId: string;

  beforeAll(async () => {
    await withDb(async (db) => {
      await db
        .insert(user)
        .values([
          { id: uid("founder"), name: "Founder", email: `${P}founder@${P}acme.dev` },
          { id: uid("cand"), name: "Candidate", email: `${P}cand@mail.dev` },
          { id: uid("other"), name: "Other", email: `${P}other@mail.dev` },
        ])
        .onConflictDoNothing();

      founder = await loadActor(db, uid("founder"));
      const created = await createCompany(db, founder, {
        name: "Candidate Test Co",
        domain: `${P}acme.dev`,
      });
      companyId = created.companyId;

      await verifyCompanyDomain(db, founder, {
        companyId,
        workEmail: `founder@${P}acme.dev`,
      });
      await acceptSla(db, founder, { companyId });

      const role = await createRole(db, founder, companyId, {
        title: "Senior Backend Engineer",
        descriptionMd: DESCRIPTION,
        roleFamily: "backend",
        seniority: "senior",
        remoteType: "remote",
        techStack: ["TypeScript", "Postgres"],
      });
      jobId = role.jobId;
      await publishRole(db, founder, jobId);
    });
  });

  afterAll(async () => {
    if (!hasDatabase) return;
    await withDb(async (db) => {
      await db.delete(company).where(sql`${company.domain} LIKE ${`${P}%`}`);
      await db.delete(user).where(sql`${user.id} LIKE ${`${P}%`}`);
    });
  });

  describe("profile", () => {
    it("starts incomplete and cannot apply", async () => {
      await withDb(async (db) => {
        const { status } = await getProfileStatus(db, uid("cand"));

        expect(status.canApply).toBe(false);
        expect(status.step).toBe("profile_basics");
      });
    });

    it("refuses to apply before the profile is complete", async () => {
      await withDb(async (db) => {
        const error = await applyToRole(db, uid("cand"), { jobId }).catch((e) => e);

        expect(error).toBeInstanceOf(ApplyError);
        expect((error as ApplyError).code).toBe("profile_incomplete");
      });
    });

    it("keeps fields left out of a partial save", async () => {
      await withDb(async (db) => {
        await saveProfile(db, uid("cand"), {
          roleFamilies: ["backend"],
          seniority: "senior",
          timezone: "Europe/Berlin",
          openTo: "remote",
          techStack: ["typescript", "postgres"],
          salaryExpectationMin: 120_000,
        });

        // A save from one onboarding step must not wipe another's answers.
        await saveProfile(db, uid("cand"), { headline: "Backend engineer" });

        const { profile } = await getProfileStatus(db, uid("cand"));
        expect(profile?.headline).toBe("Backend engineer");
        expect(profile?.seniority).toBe("senior");
        expect(profile?.timezone).toBe("Europe/Berlin");
      });
    });

    it("becomes complete once history is added", async () => {
      await withDb(async (db) => {
        await addExperience(db, uid("cand"), {
          companyName: "Previous Startup",
          title: "Backend Engineer",
          companyStageAtJoin: "seed",
          teamSizeAtJoin: 6,
          wasFirstInFunction: true,
        });

        const { status } = await getProfileStatus(db, uid("cand"));
        expect(status.canApply).toBe(true);
        expect(status.step).toBe("ready");
      });
    });
  });

  describe("search", () => {
    it("ranks the role and says why it surfaced", async () => {
      await withDb(async (db) => {
        const results = await searchRoles(db, uid("cand"));
        const match = results.find((result) => result.id === jobId);

        expect(match).toBeDefined();
        expect(match!.score).toBeGreaterThan(0.5);
        expect(match!.reasons.map((r) => r.kind)).toContain("role_family");
      });
    });

    it("hides roles the candidate cannot apply to, unless asked", async () => {
      await withDb(async (db) => {
        await saveProfile(db, uid("other"), {
          roleFamilies: ["ml_ai"],
          seniority: "junior",
          timezone: "UTC",
          openTo: "remote",
        });
        await addExperience(db, uid("other"), {
          companyName: "Elsewhere",
          title: "ML Engineer",
        });

        const filtered = await searchRoles(db, uid("other"));
        expect(filtered.map((r) => r.id)).not.toContain(jobId);

        const all = await searchRoles(db, uid("other"), { onlyEligible: false });
        const blocked = all.find((r) => r.id === jobId);
        expect(blocked?.eligibility.allowed).toBe(false);
        // The refusal has to be explainable, not just a hidden row.
        expect(blocked?.eligibility.reasons.length).toBeGreaterThan(0);
      });
    });

    it("shows everything to a signed-out visitor", async () => {
      await withDb(async (db) => {
        const results = await searchRoles(db, null);
        expect(results.map((r) => r.id)).toContain(jobId);
      });
    });
  });

  describe("applying", () => {
    it("submits and sets the deadline the company must meet", async () => {
      await withDb(async (db) => {
        const result = await applyToRole(db, uid("cand"), {
          jobId,
          coverLetter: "I have done this before.",
        });

        expect(result.slaDueAt.getTime()).toBeGreaterThan(Date.now());
        expect(result.quota.used).toBe(1);

        const row = await db.query.application.findFirst({
          where: eq(application.id, result.applicationId),
        });
        expect(row?.slaState).toBe("pending");
      });
    });

    it("refuses a second application to the same role", async () => {
      await withDb(async (db) => {
        const error = await applyToRole(db, uid("cand"), { jobId }).catch((e) => e);
        expect((error as ApplyError).code).toBe("already_applied");
      });
    });

    it("does not spend an application on a refused attempt", async () => {
      await withDb(async (db) => {
        const before = await getQuota(db, uid("cand"));
        await applyToRole(db, uid("cand"), { jobId }).catch(() => undefined);
        const after = await getQuota(db, uid("cand"));

        // A rejected attempt must not cost one of the eight.
        expect(after.used).toBe(before.used);
      });
    });

    it("refuses when the role does not match", async () => {
      await withDb(async (db) => {
        const error = await applyToRole(db, uid("other"), { jobId }).catch((e) => e);
        expect((error as ApplyError).code).toBe("not_eligible");
      });
    });
  });

  describe("the weekly allowance", () => {
    it("cannot be exceeded by concurrent attempts", async () => {
      // The cap is what makes the response promise keepable, so two tabs racing
      // must not be able to get past it.
      await withDb(async (db) => {
        const racer = uid("racer");
        await db
          .insert(user)
          .values({ id: racer, name: "Racer", email: `${P}racer@mail.dev` })
          .onConflictDoNothing();

        await saveProfile(db, racer, {
          roleFamilies: ["backend"],
          seniority: "senior",
          timezone: "UTC",
          openTo: "remote",
        });
        await addExperience(db, racer, { companyName: "Somewhere", title: "Engineer" });

        // Create more roles than the allowance so the limit, not supply, binds.
        const roleIds: string[] = [];
        for (let index = 0; index < WEEKLY_APPLICATION_LIMIT + 3; index += 1) {
          const created = await createRole(db, founder, companyId, {
            title: `Backend Engineer ${index}`,
            descriptionMd: DESCRIPTION,
            roleFamily: "backend",
            seniority: "senior",
            remoteType: "remote",
          });
          await publishRole(db, founder, created.jobId);
          roleIds.push(created.jobId);
        }

        // Each attempt gets its own connection, because that is what a real
        // race looks like: one request per Worker invocation. Sharing a single
        // pg.Client would serialise them and prove nothing.
        const outcomes = await Promise.allSettled(
          roleIds.map((id) => withDb((ownDb) => applyToRole(ownDb, racer, { jobId: id }))),
        );

        const accepted = outcomes.filter((o) => o.status === "fulfilled").length;
        expect(accepted).toBe(WEEKLY_APPLICATION_LIMIT);

        const quota = await getQuota(db, racer);
        expect(quota.used).toBe(WEEKLY_APPLICATION_LIMIT);
        expect(quota.remaining).toBe(0);

        const rows = await db
          .select({ id: application.id })
          .from(application)
          .where(eq(application.userId, racer));
        expect(rows).toHaveLength(WEEKLY_APPLICATION_LIMIT);
      });
    });

    it("reports the allowance as exhausted rather than failing opaquely", async () => {
      await withDb(async (db) => {
        const extra = await createRole(db, founder, companyId, {
          title: "One more backend role",
          descriptionMd: DESCRIPTION,
          roleFamily: "backend",
          seniority: "senior",
          remoteType: "remote",
        });
        await publishRole(db, founder, extra.jobId);

        const error = await applyToRole(db, uid("racer"), { jobId: extra.jobId }).catch(
          (e) => e,
        );

        expect((error as ApplyError).code).toBe("quota_exhausted");
        expect((error as Error).message).toMatch(/this week/i);
      });
    });
  });

  describe("the full loop", () => {
    it("carries a real application through to a reply that satisfies the SLA", async () => {
      await withDb(async (db) => {
        // The company sees the candidate's application in its inbox.
        const mine = await listMyApplications(db, uid("cand"));
        const target = mine.find((entry) => entry.jobId === jobId)!;
        expect(target.slaState).toBe("pending");

        // It replies, which is the only thing that satisfies the promise.
        const result = await respondToApplication(db, founder, {
          applicationId: target.id,
          body: "Thanks — we would like to talk next week.",
        });

        expect(result.slaState).toBe("answered");

        const after = await listMyApplications(db, uid("cand"));
        const updated = after.find((entry) => entry.id === target.id)!;
        expect(updated.slaState).toBe("answered");
        expect(updated.firstResponseAt).not.toBeNull();
      });
    });

    it("releases the company when the candidate withdraws", async () => {
      await withDb(async (db) => {
        const racerApplications = await listMyApplications(db, uid("racer"));
        const first = racerApplications[0];

        await withdrawApplication(db, uid("racer"), first.id);

        const row = await db.query.application.findFirst({
          where: eq(application.id, first.id),
        });

        // Not a breach: blaming a company for someone else's change of mind
        // would make the published rate dishonest in the other direction.
        expect(row?.slaState).toBe("cancelled");
        expect(row?.status).toBe("withdrawn");
      });
    });
  });
});
