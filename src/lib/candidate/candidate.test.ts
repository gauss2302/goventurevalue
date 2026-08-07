import { describe, expect, it, vi } from "vitest";

import type { LlmProvider } from "@/lib/ai/index";
import {
  parseResume,
  parsedResumeSchema,
  proposedChanges,
  RESUME_SYSTEM_PROMPT,
  ResumeParseError,
} from "@/lib/candidate/resume";
import {
  applicationEligibility,
  canBuildEmbedding,
  missingRequirements,
  onboardingStatus,
  REQUIREMENT_REASONS,
  type CandidateProfileState,
} from "@/lib/candidate/onboarding";

const validParse = {
  headline: "Senior Backend Engineer",
  yearsExperience: 8,
  roleFamilies: ["backend"],
  seniority: "senior",
  techStack: ["typescript", "postgres"],
  domains: ["developer tools"],
  experience: [
    {
      companyName: "Acme",
      title: "Senior Backend Engineer",
      companyStageAtJoin: null,
      teamSizeAtJoin: null,
      startedAt: "2022-03",
      endedAt: null,
      wasFirstInFunction: null,
    },
  ],
};

const providerReturning = (payload: unknown): LlmProvider => ({
  name: "test",
  complete: vi.fn(async () => ({
    rawText: typeof payload === "string" ? payload : JSON.stringify(payload),
    provider: "test",
    model: "test-model",
  })),
});

describe("résumé parse schema", () => {
  it("accepts a well-formed parse", () => {
    expect(parsedResumeSchema.safeParse(validParse).success).toBe(true);
  });

  it("accepts nulls for everything a résumé rarely states", () => {
    // Null is the correct answer, not a degraded one.
    const sparse = {
      ...validParse,
      headline: null,
      yearsExperience: null,
      seniority: null,
      roleFamilies: [],
      techStack: [],
      domains: [],
    };

    expect(parsedResumeSchema.safeParse(sparse).success).toBe(true);
  });

  it("rejects a role family outside the vertical", () => {
    // The vertical is engineering and product only (§0); "design" must not slip
    // in and silently break the hard filters.
    const result = parsedResumeSchema.safeParse({
      ...validParse,
      roleFamilies: ["design"],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a malformed date rather than coercing it", () => {
    expect(
      parsedResumeSchema.safeParse({
        ...validParse,
        experience: [{ ...validParse.experience[0], startedAt: "March 2022" }],
      }).success,
    ).toBe(false);
  });

  it("rejects a non-positive team size", () => {
    expect(
      parsedResumeSchema.safeParse({
        ...validParse,
        experience: [{ ...validParse.experience[0], teamSizeAtJoin: 0 }],
      }).success,
    ).toBe(false);
  });
});

describe("the prompt forbids inference", () => {
  it("tells the model never to guess stage or team size", () => {
    // These two are the highest-value trajectory signals and the ones a model
    // will most readily invent from a company's reputation.
    expect(RESUME_SYSTEM_PROMPT).toMatch(/NEVER guess "companyStageAtJoin"/);
    expect(RESUME_SYSTEM_PROMPT).toMatch(/NEVER guess "teamSizeAtJoin"/);
    expect(RESUME_SYSTEM_PROMPT).toMatch(/A missing value is a correct answer/);
  });
});

describe("parseResume", () => {
  it("returns a proposal carrying the model that produced it", async () => {
    const proposal = await parseResume({
      resumeText: "8 years of backend work.",
      provider: providerReturning(validParse),
    });

    expect(proposal.fields.seniority).toBe("senior");
    // Recorded so a proposal from a model we later replace can be re-run rather
    // than silently trusted.
    expect(proposal.model).toBe("test-model");
    expect(proposal.provider).toBe("test");
    expect(proposal.parsedAt).toBeInstanceOf(Date);
  });

  it("asks for JSON at temperature zero", async () => {
    const provider = providerReturning(validParse);

    await parseResume({ resumeText: "text", provider });

    expect(provider.complete).toHaveBeenCalledWith(
      expect.objectContaining({ json: true, temperature: 0 }),
    );
  });

  it("tolerates the markdown fences models add anyway", async () => {
    const fenced = "```json\n" + JSON.stringify(validParse) + "\n```";

    const proposal = await parseResume({
      resumeText: "text",
      provider: providerReturning(fenced),
    });

    expect(proposal.fields.roleFamilies).toEqual(["backend"]);
  });

  it("rejects empty extraction instead of writing an empty profile", async () => {
    // A PDF that yielded no text is a failure to surface, not a blank profile
    // to save.
    await expect(
      parseResume({ resumeText: "   ", provider: providerReturning(validParse) }),
    ).rejects.toThrow(ResumeParseError);
  });

  it("fails loudly when the model returns something invalid", async () => {
    await expect(
      parseResume({
        resumeText: "text",
        provider: providerReturning({ ...validParse, seniority: "wizard" }),
      }),
    ).rejects.toThrow(ResumeParseError);
  });

  it("fails loudly on unparseable output", async () => {
    await expect(
      parseResume({ resumeText: "text", provider: providerReturning("not json at all") }),
    ).rejects.toThrow();
  });
});

describe("proposedChanges", () => {
  it("lists only fields that would actually change", () => {
    const changes = proposedChanges({
      proposal: validParse as never,
      current: { headline: "Senior Backend Engineer", seniority: "senior" },
    });

    expect(changes).not.toContain("headline");
    expect(changes).not.toContain("seniority");
    expect(changes).toContain("yearsExperience");
  });

  it("never proposes overwriting with a null the parser could not fill", () => {
    // A value the candidate corrected by hand must not be erased by a parse
    // that simply failed to find it.
    const changes = proposedChanges({
      proposal: { ...validParse, headline: null, seniority: null } as never,
      current: { headline: "Staff Engineer", seniority: "staff" },
    });

    expect(changes).not.toContain("headline");
    expect(changes).not.toContain("seniority");
  });

  it("returns nothing when the profile already matches", () => {
    expect(
      proposedChanges({
        proposal: validParse as never,
        current: {
          headline: validParse.headline,
          yearsExperience: validParse.yearsExperience,
          seniority: validParse.seniority as never,
          roleFamilies: validParse.roleFamilies as never,
          techStack: validParse.techStack,
        },
      }),
    ).toEqual([]);
  });
});

const readyProfile: CandidateProfileState = {
  exists: true,
  roleFamilies: ["backend"],
  seniority: "senior",
  timezone: "Europe/Berlin",
  openTo: "remote",
  confirmedExperienceCount: 2,
};

describe("onboarding", () => {
  it("reports every requirement missing before a profile exists", () => {
    const status = onboardingStatus({ exists: false, confirmedExperienceCount: 0 });

    expect(status.step).toBe("profile_basics");
    expect(status.missing).toHaveLength(Object.keys(REQUIREMENT_REASONS).length);
    expect(status.completeness).toBe(0);
    expect(status.canApply).toBe(false);
  });

  it("reaches ready when every requirement is met", () => {
    const status = onboardingStatus(readyProfile);

    expect(status.step).toBe("ready");
    expect(status.missing).toEqual([]);
    expect(status.completeness).toBe(1);
    expect(status.canApply).toBe(true);
  });

  it("sends a candidate back to the earliest gap, not the furthest", () => {
    // Preferences filled but history skipped: the step must be 'trajectory',
    // otherwise the candidate is told they are nearly done when they are not.
    const status = onboardingStatus({ ...readyProfile, confirmedExperienceCount: 0 });

    expect(status.step).toBe("trajectory");
    expect(status.missing).toEqual(["trajectory"]);
  });

  it("does not count an unconfirmed parse as history", () => {
    // A parse is a proposal (§6.2): until the candidate accepts it, the profile
    // is not complete and matching has nothing confirmed to reason about.
    const status = onboardingStatus({
      ...readyProfile,
      confirmedExperienceCount: 0,
      resumeUploaded: true,
      resumeParsedPendingConfirmation: true,
    });

    expect(status.canApply).toBe(false);
    expect(status.awaitingResumeConfirmation).toBe(true);
    expect(status.missing).toContain("trajectory");
  });

  it("treats a résumé as optional when the history was entered by hand", () => {
    const status = onboardingStatus({ ...readyProfile, resumeUploaded: false });

    expect(status.canApply).toBe(true);
  });

  it("does not require optional fields that feed neither filter nor embedding", () => {
    const status = onboardingStatus({
      ...readyProfile,
      yearsExperience: null,
      techStack: [],
      preferredStages: [],
    });

    expect(status.canApply).toBe(true);
  });

  it.each(["roleFamilies", "seniority", "timezone", "openTo"] as const)(
    "blocks applying without %s",
    (field) => {
      const status = onboardingStatus({ ...readyProfile, [field]: null });

      expect(status.canApply).toBe(false);
      expect(status.missing).toContain(field);
    },
  );

  it("reports an empty role family list as missing, not as satisfied", () => {
    expect(missingRequirements({ ...readyProfile, roleFamilies: [] })).toContain("roleFamilies");
  });
});

describe("applicationEligibility", () => {
  it("explains what is missing rather than only refusing", () => {
    const result = applicationEligibility({ ...readyProfile, timezone: null });

    expect(result.allowed).toBe(false);
    expect(result.missing).toEqual(["timezone"]);
    expect(result.reasons[0]).toMatch(/overlap with the team/);
  });

  it("allows a complete profile", () => {
    expect(applicationEligibility(readyProfile).allowed).toBe(true);
  });
});

describe("canBuildEmbedding", () => {
  it("requires a confirmed trajectory", () => {
    // Stricter than canApply on purpose: an embedding built from role family
    // and seniority alone degenerates into the tag matching we criticise.
    expect(canBuildEmbedding({ ...readyProfile, confirmedExperienceCount: 0 })).toBe(false);
    expect(canBuildEmbedding(readyProfile)).toBe(true);
  });

  it("is false without a profile at all", () => {
    expect(canBuildEmbedding({ exists: false, confirmedExperienceCount: 3 })).toBe(false);
  });
});
