import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { withDb } from "@/db/index";
import {
  application,
  company,
  job,
  moderationItem,
  notification,
  slaWarning,
  user,
} from "@/db/schema";
import { MIN_MEASURED_APPLICATIONS, SLA_MAX_WARNINGS } from "@/config/brand";
import { loadActor, type Actor } from "@/lib/company/context";
import { acceptSla, createCompany, verifyCompanyDomain } from "@/lib/company/service";
import { createRole, publishRole } from "@/lib/job/service";
import { MIN_DESCRIPTION_LENGTH } from "@/lib/job/publishRequirements";
import { respondToApplication } from "@/lib/application/service";
import {
  handleBreach,
  handleCompanyReview,
  handleReminder,
  planSweep,
} from "@/lib/application/sweep";
import { publishBlockedReason, warningWindowStart } from "@/lib/company/slaPolicy";

/**
 * The sweep, against a real database.
 *
 * The unit tests cover the arithmetic. What has to be proved here is the
 * behaviour under the conditions Cloudflare Queues actually deliver: the same
 * message twice, and a message that arrives after the world has moved on.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const P = "swp-";
const uid = (suffix: string) => `${P}${suffix}`;

const DESCRIPTION =
  "You will own the ingestion pipeline end to end, working with the founders. ".repeat(2) +
  "x".repeat(MIN_DESCRIPTION_LENGTH);

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

describe.skipIf(!hasDatabase)("the SLA sweep", () => {
  let founder: Actor;
  let companyId: string;

  /** Puts an application straight into the state the sweep is meant to find. */
  const seedApplication = async (
    label: string,
    input: { appliedAt: Date; slaDueAt: Date },
  ): Promise<string> =>
    withDb(async (db) => {
      const role = await createRole(db, founder, companyId, {
        title: `Role ${label}`,
        descriptionMd: DESCRIPTION,
        roleFamily: "backend",
        seniority: "senior",
        remoteType: "remote",
      });
      await publishRole(db, founder, role.jobId);

      const applicationId = `${P}app-${label}`;
      await db.insert(application).values({
        id: applicationId,
        jobId: role.jobId,
        userId: uid("cand"),
        appliedAt: input.appliedAt,
        slaDueAt: input.slaDueAt,
      });

      return applicationId;
    });

  beforeAll(async () => {
    await withDb(async (db) => {
      await db
        .insert(user)
        .values([
          { id: uid("founder"), name: "Founder", email: `${P}founder@${P}acme.dev` },
          { id: uid("cand"), name: "Candidate", email: `${P}cand@mail.dev` },
        ])
        .onConflictDoNothing();

      founder = await loadActor(db, uid("founder"));
      const created = await createCompany(db, founder, {
        name: "Sweep Test Co",
        domain: `${P}acme.dev`,
      });
      companyId = created.companyId;

      await verifyCompanyDomain(db, founder, {
        companyId,
        workEmail: `founder@${P}acme.dev`,
      });
      await acceptSla(db, founder, { companyId });
    });
  });

  afterAll(async () => {
    if (!hasDatabase) return;
    await withDb(async (db) => {
      await db.delete(company).where(sql`${company.domain} LIKE ${`${P}%`}`);
      await db.delete(user).where(sql`${user.id} LIKE ${`${P}%`}`);
    });
  });

  describe("finding work", () => {
    it("classifies each deadline into the right message", async () => {
      const now = new Date();

      const soon = await seedApplication("soon", {
        appliedAt: new Date(now.getTime() - 5 * DAY),
        slaDueAt: new Date(now.getTime() + 36 * HOUR),
      });
      const urgent = await seedApplication("urgent", {
        appliedAt: new Date(now.getTime() - 6 * DAY),
        slaDueAt: new Date(now.getTime() + 6 * HOUR),
      });
      const late = await seedApplication("late", {
        appliedAt: new Date(now.getTime() - 9 * DAY),
        slaDueAt: new Date(now.getTime() - 2 * DAY),
      });
      const far = await seedApplication("far", {
        appliedAt: now,
        slaDueAt: new Date(now.getTime() + 7 * DAY),
      });

      const plan = await withDb((db) => planSweep(db, now));
      const forId = (id: string) =>
        plan.messages.filter(
          (message) => "applicationId" in message && message.applicationId === id,
        );

      expect(forId(soon)).toEqual([
        { kind: "sla.remind", applicationId: soon, stage: "due_soon" },
      ]);
      expect(forId(urgent)).toEqual([
        { kind: "sla.remind", applicationId: urgent, stage: "escalate" },
      ]);
      expect(forId(late)).toEqual([{ kind: "sla.breach", applicationId: late }]);
      // A week out is nobody's problem yet, and a notification about it would be
      // noise that teaches people to ignore the rest.
      expect(forId(far)).toEqual([]);
    });
  });

  describe("reminders", () => {
    it("tells the accountable member, once", async () => {
      const now = new Date();
      const applicationId = await seedApplication("remind", {
        appliedAt: new Date(now.getTime() - 5 * DAY),
        slaDueAt: new Date(now.getTime() + 36 * HOUR),
      });

      const first = await withDb((db) =>
        handleReminder(db, { applicationId, stage: "due_soon" }, now),
      );
      // The same message, delivered again — which Queues guarantee eventually.
      const second = await withDb((db) =>
        handleReminder(db, { applicationId, stage: "due_soon" }, now),
      );

      expect(first).toMatchObject({ status: "done", created: 1 });
      expect(second).toMatchObject({ status: "done", created: 0 });

      const rows = await withDb((db) =>
        db
          .select({ id: notification.id, kind: notification.kind })
          .from(notification)
          .where(eq(notification.applicationId, applicationId)),
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].kind).toBe("reply_due_soon");
    });

    it("says nothing when the company already replied", async () => {
      const now = new Date();
      const applicationId = await seedApplication("answered", {
        appliedAt: new Date(now.getTime() - 5 * DAY),
        slaDueAt: new Date(now.getTime() + 36 * HOUR),
      });

      await withDb((db) =>
        respondToApplication(db, founder, {
          applicationId,
          body: "Thanks — we will be in touch.",
        }),
      );

      const outcome = await withDb((db) =>
        handleReminder(db, { applicationId, stage: "due_soon" }, now),
      );

      // "You owe this candidate a reply" ten minutes after replying is how a
      // system stops being trusted.
      expect(outcome).toMatchObject({ status: "stale" });
      expect(outcome.status === "stale" && outcome.reason).toContain("answered");
    });

    it("does not fire a stage the clock has already passed", async () => {
      const now = new Date();
      const applicationId = await seedApplication("passed-stage", {
        appliedAt: new Date(now.getTime() - 6 * DAY),
        slaDueAt: new Date(now.getTime() + 4 * HOUR),
      });

      const outcome = await withDb((db) =>
        handleReminder(db, { applicationId, stage: "due_soon" }, now),
      );

      expect(outcome).toMatchObject({ status: "stale" });
      expect(outcome.status === "stale" && outcome.reason).toContain("escalate");
    });
  });

  describe("breaches", () => {
    it("tells the candidate and the company, and asks for a company review", async () => {
      const now = new Date();
      const applicationId = await seedApplication("breach", {
        appliedAt: new Date(now.getTime() - 9 * DAY),
        slaDueAt: new Date(now.getTime() - 2 * DAY),
      });

      const outcome = await withDb((db) => handleBreach(db, { applicationId }, now));

      expect(outcome.status).toBe("done");
      expect(outcome.status === "done" && outcome.follow).toEqual([
        { kind: "company.review", companyId },
      ]);

      const rows = await withDb((db) =>
        db
          .select({ kind: notification.kind, userId: notification.userId })
          .from(notification)
          .where(eq(notification.applicationId, applicationId)),
      );

      expect(rows.some((r) => r.kind === "reply_deadline_missed" && r.userId === uid("cand"))).toBe(
        true,
      );
      expect(rows.some((r) => r.kind === "reply_overdue" && r.userId === uid("founder"))).toBe(
        true,
      );

      // Replayed: the state is already breached, so nothing new is said.
      const replay = await withDb((db) => handleBreach(db, { applicationId }, now));
      expect(replay).toMatchObject({ status: "done", created: 0 });
    });

    it("refuses to record a breach the events do not support", async () => {
      const now = new Date();
      const applicationId = await seedApplication("late-reply", {
        appliedAt: new Date(now.getTime() - 9 * DAY),
        slaDueAt: new Date(now.getTime() - 2 * DAY),
      });

      // The reply lands between the cron looking and the message arriving.
      await withDb((db) =>
        respondToApplication(db, founder, { applicationId, body: "Sorry for the delay." }),
      );

      const outcome = await withDb((db) => handleBreach(db, { applicationId }, now));

      // Still a breach for the metric — a late reply is not an on-time one — but
      // the handler must derive that, not assume it.
      expect(outcome.status).toBe("done");

      const row = await withDb((db) =>
        db.query.application.findFirst({ where: eq(application.id, applicationId) }),
      );
      expect(row?.slaState).toBe("breached");
      expect(row?.firstResponseAt).not.toBeNull();
    });
  });

  describe("the warning ladder", () => {
    // The ladder is spaced in wall-clock time, so the tests move the clock
    // rather than calling the handler repeatedly. `base` is the moment the
    // breaches were recorded; each review happens a week further on.
    const base = new Date();
    const weekAfter = (weeks: number) => new Date(base.getTime() + weeks * 7 * DAY);

    it("issues one warning per window of real time, however many weeks are owed", async () => {
      // Four separate weeks with an unanswered applicant, none warned yet — the
      // state a company is in after we have been down for a month.
      for (const [index, weeksAgo] of [5, 4, 3, 2].entries()) {
        const applicationId = await seedApplication(`ladder-${index}`, {
          appliedAt: new Date(base.getTime() - (weeksAgo * 7 + 9) * DAY),
          slaDueAt: new Date(base.getTime() - (weeksAgo * 7 + 2) * DAY),
        });
        await withDb((db) => handleBreach(db, { applicationId }, base));
      }

      const first = await withDb((db) => handleCompanyReview(db, { companyId }, base));
      expect(first.status).toBe("done");

      const afterOne = await withDb((db) =>
        db.select().from(slaWarning).where(eq(slaWarning.companyId, companyId)),
      );
      expect(afterOne).toHaveLength(1);

      // Running the sweep again an hour later must change nothing. Four owed
      // weeks must not become four rungs in four hours — every rung has to
      // arrive with time to act on it.
      await withDb((db) =>
        handleCompanyReview(db, { companyId }, new Date(base.getTime() + HOUR)),
      );
      const afterAnHour = await withDb((db) =>
        db.select().from(slaWarning).where(eq(slaWarning.companyId, companyId)),
      );
      expect(afterAnHour).toHaveLength(1);

      // A week later, the next rung.
      await withDb((db) => handleCompanyReview(db, { companyId }, weekAfter(1)));
      const afterTwo = await withDb((db) =>
        db
          .select()
          .from(slaWarning)
          .where(eq(slaWarning.companyId, companyId))
          .orderBy(slaWarning.windowStart),
      );
      expect(afterTwo).toHaveLength(2);

      // Oldest week first, so the history reads in order.
      expect(afterTwo[0].windowStart < afterTwo[1].windowStart).toBe(true);
    });

    it("marks the company for candidates at the second warning", async () => {
      const row = await withDb((db) =>
        db.query.company.findFirst({ where: eq(company.id, companyId) }),
      );

      expect(row?.slaWarningLevel).toBe(2);
      expect(row?.slaMarkedAt).not.toBeNull();
      expect(publishBlockedReason({ slaWarningLevel: row!.slaWarningLevel })).toBeNull();
    });

    it("blocks new roles at the third", async () => {
      await withDb((db) => handleCompanyReview(db, { companyId }, weekAfter(2)));

      const row = await withDb((db) =>
        db.query.company.findFirst({ where: eq(company.id, companyId) }),
      );

      expect(row?.slaWarningLevel).toBe(3);
      expect(publishBlockedReason({ slaWarningLevel: 3 })).toContain("before publishing");
    });

    it("takes the roles down at the fourth and asks a human to decide", async () => {
      const now = weekAfter(3);
      await withDb((db) => handleCompanyReview(db, { companyId }, now));

      const row = await withDb((db) =>
        db.query.company.findFirst({ where: eq(company.id, companyId) }),
      );

      expect(row?.slaWarningLevel).toBe(SLA_MAX_WARNINGS);
      expect(row?.lifecycle).toBe("suspended");
      expect(row?.suspendedForSlaAt).not.toBeNull();

      const stillPublished = await withDb((db) =>
        db
          .select({ id: job.id })
          .from(job)
          .where(and(eq(job.companyId, companyId), eq(job.status, "published"))),
      );
      expect(stillPublished).toHaveLength(0);

      // Removal is a curator's call, not the cron's (§0).
      const items = await withDb((db) =>
        db
          .select({ id: moderationItem.id, priority: moderationItem.priority })
          .from(moderationItem)
          .where(
            and(
              eq(moderationItem.companyId, companyId),
              eq(moderationItem.kind, "sla_breach"),
            ),
          ),
      );
      expect(items).toHaveLength(1);

      // A second review must not bury the queue under the same company.
      await withDb((db) => handleCompanyReview(db, { companyId }, now));
      const again = await withDb((db) =>
        db
          .select({ id: moderationItem.id })
          .from(moderationItem)
          .where(
            and(
              eq(moderationItem.companyId, companyId),
              eq(moderationItem.kind, "sla_breach"),
            ),
          ),
      );
      expect(again).toHaveLength(1);
    });

    it("keeps reviewing a company on the ladder without a fresh breach", async () => {
      // Otherwise the ladder stalls: the next owed rung never becomes issuable
      // and old warnings never decay out of the level.
      const plan = await withDb((db) => planSweep(db, weekAfter(4)));

      expect(plan.messages).toContainEqual({ kind: "company.review", companyId });
    });

    it("keeps warnings on the week they belong to", async () => {
      const rows = await withDb((db) =>
        db.select().from(slaWarning).where(eq(slaWarning.companyId, companyId)),
      );

      for (const row of rows) {
        // The stored window is a Monday, which is what makes the unique index a
        // real idempotency guarantee rather than a coincidence.
        expect(row.windowStart).toBe(warningWindowStart(new Date(`${row.windowStart}T12:00:00Z`)));
      }
    });
  });

  describe("what gets published", () => {
    it("withholds the rate until there is enough to stand behind", async () => {
      const row = await withDb((db) =>
        db.query.company.findFirst({ where: eq(company.id, companyId) }),
      );

      if (row!.slaMeasuredCount < MIN_MEASURED_APPLICATIONS) {
        expect(row?.responseRate30d).toBeNull();
        expect(row?.medianFirstResponseHours).toBeNull();
      } else {
        expect(row?.responseRate30d).not.toBeNull();
      }

      // The counts themselves are facts and are always kept.
      expect(row!.slaBreachCount).toBeGreaterThan(0);
      expect(row!.slaMeasuredCount).toBeGreaterThan(0);
    });
  });
});
