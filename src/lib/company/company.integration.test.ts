import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { withDb, type Database } from "@/db/index";
import { application, applicationEvent, company, companyMember, job, user } from "@/db/schema";
import { SLA_TERMS_VERSION } from "@/config/brand";
import { loadActor, ForbiddenError, type Actor } from "@/lib/company/context";
import {
  acceptInvite,
  acceptSla,
  CompanyAlreadyExistsError,
  changeMemberRole,
  createCompany,
  emailDomain,
  inviteMember,
  isPublicEmailDomain,
  listMembers,
  removeMember,
  setSlaContact,
  slugify,
  verifyCompanyDomain,
} from "@/lib/company/service";
import {
  archiveRole,
  createRole,
  duplicateRole,
  getRole,
  listRoles,
  publishRole,
  restoreRole,
  unpublishRole,
  updateRole,
} from "@/lib/job/service";
import { MIN_DESCRIPTION_LENGTH } from "@/lib/job/publishRequirements";
import {
  changeApplicationStatus,
  companySlaDashboard,
  findOverdueApplications,
  getApplicationThread,
  listInbox,
  markBreached,
  refreshCompanyResponseStats,
  respondToApplication,
} from "@/lib/application/service";
import { computeSlaDueAt } from "@/lib/application/sla";

/**
 * End-to-end company-side flow against a real Postgres.
 *
 * Skipped without DATABASE_URL, like the schema suite. See docs/PHASE_0.md for
 * how to run a local database.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const P = "cit-";

/** Long enough to clear the publish bar without saying anything meaningful. */
const DESCRIPTION =
  "You will own our ingestion pipeline end to end, working directly with the two founders. ".repeat(
    2,
  ) + "x".repeat(MIN_DESCRIPTION_LENGTH);

const uid = (suffix: string) => `${P}${suffix}`;

const seedUser = async (db: Database, suffix: string, email: string) => {
  await db.insert(user).values({ id: uid(suffix), name: suffix, email }).onConflictDoNothing();
  return uid(suffix);
};

describe.skipIf(!hasDatabase)("company side, end to end", () => {
  let founder: Actor;
  let companyId: string;
  let founderMemberId: string;

  beforeAll(async () => {
    await withDb(async (db) => {
      await seedUser(db, "founder", `${P}founder@acme.dev`);
      await seedUser(db, "recruiter", `${P}rec@acme.dev`);
      await seedUser(db, "outsider", `${P}out@other.dev`);
      await seedUser(db, "cand", `${P}cand@mail.dev`);

      founder = await loadActor(db, uid("founder"));
      const created = await createCompany(db, founder, {
        name: "Acme AI",
        domain: `${P}acme.dev`,
        website: "https://acme.dev",
      });
      companyId = created.companyId;
      founderMemberId = created.memberId;
    });
  });

  afterAll(async () => {
    if (!hasDatabase) return;
    await withDb(async (db) => {
      await db.delete(company).where(sql`${company.domain} LIKE ${`${P}%`}`);
      await db.delete(user).where(sql`${user.id} LIKE ${`${P}%`}`);
    });
  });

  describe("onboarding", () => {
    it("creates the company in onboarding with the creator as owner", async () => {
      await withDb(async (db) => {
        const row = await db.query.company.findFirst({ where: eq(company.id, companyId) });

        // Never straight to onboarded: publishing needs both gates first.
        expect(row?.lifecycle).toBe("onboarding");
        expect(row?.slaAcceptedAt).toBeNull();
        expect(row?.domainVerifiedAt).toBeNull();

        const member = await db.query.companyMember.findFirst({
          where: eq(companyMember.id, founderMemberId),
        });
        expect(member?.role).toBe("owner");
        // The creator is the default reminder recipient — an unaddressed
        // obligation is one nobody acts on.
        expect(member?.isSlaContact).toBe(true);
      });
    });

    it("refuses to publish before the gates are satisfied", async () => {
      await withDb(async (db) => {
        const { jobId } = await createRole(db, founder, companyId, {
          title: "Senior Backend Engineer",
          roleFamily: "backend",
          seniority: "senior",
        });

        const outcome = await publishRole(db, founder, jobId);

        expect(outcome.published).toBe(false);
        if (outcome.published) throw new Error("unreachable");
        expect(outcome.reason).toMatch(/domain is not verified/i);
      });
    });

    it("sends a free-mail address to manual review instead of rejecting it", async () => {
      await withDb(async (db) => {
        // Plenty of seed founders still run on gmail; refusing outright would
        // cost real customers.
        const outcome = await verifyCompanyDomain(db, founder, {
          companyId,
          workEmail: "founder@gmail.com",
        });

        expect(outcome.state).toBe("manual_review");
        if (outcome.state !== "manual_review") throw new Error("unreachable");
        expect(outcome.reason).toMatch(/public domain/i);

        const row = await db.query.company.findFirst({ where: eq(company.id, companyId) });
        expect(row?.domainVerifiedAt).toBeNull();
      });
    });

    it("verifies a matching corporate domain", async () => {
      await withDb(async (db) => {
        const outcome = await verifyCompanyDomain(db, founder, {
          companyId,
          workEmail: `ann@${P}acme.dev`,
        });

        expect(outcome.state).toBe("verified");

        const row = await db.query.company.findFirst({ where: eq(company.id, companyId) });
        expect(row?.domainVerifiedAt).not.toBeNull();
        // Still not publishable: the commitment has not been made yet.
        expect(row?.lifecycle).toBe("onboarding");
      });
    });

    it("records which terms were accepted, not just that they were", async () => {
      await withDb(async (db) => {
        const result = await acceptSla(db, founder, { companyId });

        expect(result.termsVersion).toBe(SLA_TERMS_VERSION);

        const row = await db.query.company.findFirst({ where: eq(company.id, companyId) });
        expect(row?.lifecycle).toBe("onboarded");
        expect(row?.slaResponseDays).toBe(result.responseDays);
        // Without this, changing the default window would restate this
        // company's public promise as something it never agreed to.
        expect(row?.slaTermsVersion).toBe(SLA_TERMS_VERSION);
        expect(row?.slaAcceptedByUserId).toBe(uid("founder"));
      });
    });

    it("rejects an absurd response window", async () => {
      await withDb(async (db) => {
        await expect(acceptSla(db, founder, { companyId, responseDays: 90 })).rejects.toThrow();
      });
    });

    it("explains a duplicate domain instead of failing on the constraint", async () => {
      // Regression: this surfaced a raw SQL insert error to the user. The domain
      // is unique by design — it is the dedupe and claim key — so hitting it
      // means the company already exists and the useful action is to join it.
      await withDb(async (db) => {
        const error = await createCompany(db, founder, {
          name: "Acme Copy",
          domain: `${P}acme.dev`,
        }).catch((e) => e);

        expect(error).toBeInstanceOf(CompanyAlreadyExistsError);
        expect((error as CompanyAlreadyExistsError).existingCompanyId).toBe(companyId);
        expect((error as Error).message).not.toMatch(/insert into/i);
      });
    });

    it("still refuses a role too thin for a candidate to judge", async () => {
      // Company gates are satisfied by now, so this is the role-level bar:
      // publishing an empty listing is the noise we position against.
      await withDb(async (db) => {
        const roles = await listRoles(db, founder, companyId);
        const outcome = await publishRole(db, founder, roles[0].id);

        expect(outcome.published).toBe(false);
        if (outcome.published) throw new Error("unreachable");
        expect(outcome.missing).toContain("description");
        expect(outcome.missing).toContain("remoteType");
      });
    });

    it("publishes once the role itself is complete", async () => {
      await withDb(async (db) => {
        const roles = await listRoles(db, founder, companyId);

        await updateRole(db, founder, roles[0].id, {
          title: "Senior Backend Engineer",
          descriptionMd: DESCRIPTION,
          remoteType: "remote",
        });

        const outcome = await publishRole(db, founder, roles[0].id);
        expect(outcome.published).toBe(true);

        const row = await db.query.job.findFirst({ where: eq(job.id, roles[0].id) });
        expect(row?.status).toBe("published");
        expect(row?.publishedAt).not.toBeNull();
      });
    });
  });

  describe("managing a role", () => {
    let roleId: string;

    beforeAll(async () => {
      await withDb(async (db) => {
        const created = await createRole(db, founder, companyId, {
          title: "Staff ML Engineer",
          descriptionMd: DESCRIPTION,
          roleFamily: "ml_ai",
          seniority: "staff",
          remoteType: "remote",
        });
        roleId = created.jobId;
      });
    });

    it("edits fields without touching the ones left out", async () => {
      await withDb(async (db) => {
        await updateRole(db, founder, roleId, { seniority: "principal" });

        const row = await db.query.job.findFirst({ where: eq(job.id, roleId) });
        expect(row?.seniority).toBe("principal");
        // Omitted fields must survive a partial update.
        expect(row?.roleFamily).toBe("ml_ai");
        expect(row?.descriptionMd).toBe(DESCRIPTION);
      });
    });

    it("refreshes the content hash when the candidate-visible text changes", async () => {
      await withDb(async (db) => {
        const before = await db.query.job.findFirst({ where: eq(job.id, roleId) });
        await updateRole(db, founder, roleId, { title: "Principal ML Engineer" });
        const after = await db.query.job.findFirst({ where: eq(job.id, roleId) });

        expect(after?.contentHash).not.toBe(before?.contentHash);
      });
    });

    it("rejects a salary band that runs backwards", async () => {
      await withDb(async (db) => {
        await expect(
          updateRole(db, founder, roleId, { salaryMin: 200_000, salaryMax: 100_000 }),
        ).rejects.toThrow(/cannot exceed/i);
      });
    });

    it("refuses a hiring manager from another company", async () => {
      await withDb(async (db) => {
        await expect(
          updateRole(db, founder, roleId, { hiringManagerMemberId: "not-a-member" }),
        ).rejects.toBeInstanceOf(ForbiddenError);
      });
    });

    it("unpublishes back to a draft rather than archiving", async () => {
      // Pausing and closing are different things; conflating them would make
      // "archived" mean two things and break any later count of closed roles.
      await withDb(async (db) => {
        await publishRole(db, founder, roleId);
        await unpublishRole(db, founder, roleId);

        const row = await db.query.job.findFirst({ where: eq(job.id, roleId) });
        expect(row?.status).toBe("pending");
        expect(row?.publishedAt).toBeNull();
      });
    });

    it("restores an archived role as a draft, never straight to live", async () => {
      await withDb(async (db) => {
        await archiveRole(db, founder, roleId);
        expect(
          (await db.query.job.findFirst({ where: eq(job.id, roleId) }))?.status,
        ).toBe("archived");

        await restoreRole(db, founder, roleId);
        const row = await db.query.job.findFirst({ where: eq(job.id, roleId) });

        expect(row?.status).toBe("pending");
        expect(row?.archivedAt).toBeNull();
      });
    });

    it("duplicates a role as a fresh draft", async () => {
      await withDb(async (db) => {
        const { jobId: copyId } = await duplicateRole(db, founder, roleId);
        const copy = await db.query.job.findFirst({ where: eq(job.id, copyId) });

        expect(copy?.title).toMatch(/\(copy\)$/);
        expect(copy?.descriptionMd).toBe(DESCRIPTION);
        // A copy must never inherit published state.
        expect(copy?.status).toBe("pending");
        expect(copy?.publishedAt).toBeNull();
      });
    });

    it("reports readiness alongside the role", async () => {
      await withDb(async (db) => {
        const { readiness } = await getRole(db, founder, roleId);
        expect(readiness.ready).toBe(true);
      });
    });

    it("denies a viewer the ability to change a role", async () => {
      await withDb(async (db) => {
        const outsider = await loadActor(db, uid("outsider"));
        await expect(
          updateRole(db, outsider, roleId, { title: "Hijacked" }),
        ).rejects.toBeInstanceOf(ForbiddenError);
      });
    });
  });

  describe("membership", () => {
    it("invites and accepts, granting exactly the invited role", async () => {
      await withDb(async (db) => {
        const invite = await inviteMember(db, founder, {
          companyId,
          email: `${P}rec@acme.dev`,
          role: "recruiter",
        });

        const accepted = await acceptInvite(db, {
          token: invite.token,
          userId: uid("recruiter"),
        });

        expect(accepted.role).toBe("recruiter");

        const members = await listMembers(db, founder, companyId);
        expect(members).toHaveLength(2);
      });
    });

    it("lets a recruiter reply but not accept the commitment", async () => {
      await withDb(async (db) => {
        const recruiter = await loadActor(db, uid("recruiter"));

        // Replying sits low on purpose: an SLA only admins can discharge gets missed.
        await expect(
          acceptSla(db, recruiter, { companyId }),
        ).rejects.toBeInstanceOf(ForbiddenError);

        await expect(
          inviteMember(db, recruiter, { companyId, email: "x@acme.dev", role: "viewer" }),
        ).rejects.toBeInstanceOf(ForbiddenError);
      });
    });

    it("denies a non-member everything, without confirming the company exists", async () => {
      await withDb(async (db) => {
        const outsider = await loadActor(db, uid("outsider"));

        await expect(listMembers(db, outsider, companyId)).rejects.toBeInstanceOf(
          ForbiddenError,
        );
      });
    });

    it("refuses to remove the last owner", async () => {
      await withDb(async (db) => {
        await expect(
          removeMember(db, founder, { companyId, memberId: founderMemberId }),
        ).rejects.toThrow(/at least one owner/i);
      });
    });

    it("refuses to demote the last owner", async () => {
      await withDb(async (db) => {
        await expect(
          changeMemberRole(db, founder, {
            companyId,
            memberId: founderMemberId,
            newRole: "admin",
          }),
        ).rejects.toThrow(/at least one owner/i);
      });
    });

    it("moves the SLA contact without violating the one-per-company rule", async () => {
      await withDb(async (db) => {
        const members = await listMembers(db, founder, companyId);
        const recruiterMember = members.find((m) => m.role === "recruiter")!;

        await setSlaContact(db, founder, { companyId, memberId: recruiterMember.id });

        const contacts = await db
          .select({ id: companyMember.id })
          .from(companyMember)
          .where(
            sql`${companyMember.companyId} = ${companyId} AND ${companyMember.isSlaContact}`,
          );

        expect(contacts).toHaveLength(1);
        expect(contacts[0].id).toBe(recruiterMember.id);
      });
    });
  });

  describe("applications inbox", () => {
    let applicationId: string;
    const appliedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    beforeAll(async () => {
      await withDb(async (db) => {
        const roles = await listRoles(db, founder, companyId);
        applicationId = `${P}app`;

        await db.insert(application).values({
          id: applicationId,
          jobId: roles[0].id,
          userId: uid("cand"),
          appliedAt,
          slaDueAt: computeSlaDueAt(appliedAt, 7),
        });

        await db.insert(applicationEvent).values({
          id: `${P}ev-submitted`,
          applicationId,
          kind: "submitted",
          isCandidateVisible: false,
          occurredAt: appliedAt,
        });
      });
    });

    it("shows the application as awaiting a reply", async () => {
      await withDb(async (db) => {
        const inbox = await listInbox(db, founder, companyId);

        expect(inbox).toHaveLength(1);
        expect(inbox[0].slaState).toBe("pending");
      });
    });

    it("does not clear the SLA when only the status changes", async () => {
      await withDb(async (db) => {
        // The decisive behaviour: real internal work, nothing the candidate sees.
        await changeApplicationStatus(db, founder, { applicationId, toStatus: "in_review" });

        const row = await db.query.application.findFirst({
          where: eq(application.id, applicationId),
        });

        expect(row?.status).toBe("in_review");
        expect(row?.slaState).toBe("pending");
        expect(row?.firstResponseAt).toBeNull();
      });
    });

    it("refuses an empty reply", async () => {
      await withDb(async (db) => {
        // An empty message would satisfy the SLA while telling the candidate
        // nothing — the loophole the response definition exists to close.
        await expect(
          respondToApplication(db, founder, { applicationId, body: "   " }),
        ).rejects.toThrow(/must contain a message/i);
      });
    });

    it("satisfies the SLA when the candidate is actually written to", async () => {
      await withDb(async (db) => {
        const result = await respondToApplication(db, founder, {
          applicationId,
          body: "Thanks for applying — we would like to talk.",
          toStatus: "interviewing",
        });

        expect(result.slaState).toBe("answered");

        const row = await db.query.application.findFirst({
          where: eq(application.id, applicationId),
        });

        // Stored state and event history must agree: the public response rate
        // is derived from these columns.
        expect(row?.slaState).toBe("answered");
        expect(row?.firstResponseAt).not.toBeNull();
        expect(row?.status).toBe("interviewing");
      });
    });

    it("records the reply and the status change as separate events", async () => {
      await withDb(async (db) => {
        const { events } = await getApplicationThread(db, founder, applicationId);
        const kinds = events.map((e) => e.kind);

        expect(kinds).toContain("message_to_candidate");
        expect(kinds).toContain("status_changed");

        const reply = events.find((e) => e.kind === "message_to_candidate")!;
        expect(reply.isCandidateVisible).toBe(true);
        expect(reply.actorMemberId).toBe(founderMemberId);

        const internal = events.find((e) => e.kind === "status_changed")!;
        expect(internal.isCandidateVisible).toBe(false);
      });
    });

    it("stops listing the application as overdue once answered", async () => {
      await withDb(async (db) => {
        const overdue = await findOverdueApplications(db, new Date(Date.now() + 86_400_000 * 30));
        expect(overdue.map((o) => o.id)).not.toContain(applicationId);
      });
    });

    it("reports the response rate and median", async () => {
      await withDb(async (db) => {
        const dashboard = await companySlaDashboard(db, founder, companyId);

        expect(dashboard.answered).toBe(1);
        expect(dashboard.breached).toBe(0);
        expect(dashboard.responseRate).toBe(1);
        expect(dashboard.awaitingReply).toBe(0);
        expect(dashboard.medianResponseHours).toBeGreaterThan(0);
      });
    });

    it("persists the public figures onto the company", async () => {
      await withDb(async (db) => {
        await refreshCompanyResponseStats(db, companyId);

        const row = await db.query.company.findFirst({ where: eq(company.id, companyId) });
        expect(Number(row?.responseRate30d)).toBe(1);
        expect(row?.slaBreachCount).toBe(0);
      });
    });
  });

  describe("breach sweep", () => {
    it("marks an unanswered overdue application as breached", async () => {
      await withDb(async (db) => {
        const roles = await listRoles(db, founder, companyId);
        const staleAppliedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        await db.insert(application).values({
          id: `${P}app-stale`,
          jobId: roles[0].id,
          userId: uid("outsider"),
          appliedAt: staleAppliedAt,
          slaDueAt: computeSlaDueAt(staleAppliedAt, 7),
        });

        const overdue = await findOverdueApplications(db);
        expect(overdue.map((o) => o.id)).toContain(`${P}app-stale`);

        const count = await markBreached(db, [`${P}app-stale`]);
        expect(count).toBe(1);

        const dashboard = await companySlaDashboard(db, founder, companyId);
        expect(dashboard.breached).toBe(1);
        expect(dashboard.responseRate).toBe(0.5);
      });
    });
  });
});

describe("helpers", () => {
  it("extracts an email domain", () => {
    expect(emailDomain("ann@acme.dev")).toBe("acme.dev");
    expect(emailDomain("ANN@Acme.DEV")).toBe("acme.dev");
    expect(emailDomain("not-an-email")).toBeNull();
  });

  it("knows which domains cannot prove a company", () => {
    expect(isPublicEmailDomain("gmail.com")).toBe(true);
    expect(isPublicEmailDomain("acme.dev")).toBe(false);
  });

  it("slugifies company names", () => {
    expect(slugify("Acme AI")).toBe("acme-ai");
    expect(slugify("  Hello, World!  ")).toBe("hello-world");
  });
});
