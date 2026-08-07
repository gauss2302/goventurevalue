import { z } from "zod";

import { parseJsonResponse, type LlmProvider } from "@/lib/ai/index";
import { roleFamilyEnum, seniorityEnum, startupStageEnum } from "@/db/schema";

/**
 * Résumé parsing (docs/PRODUCT_PLAN.md §6.2).
 *
 * Two rules govern this module, and both are the honesty contract (§6.4) applied
 * to candidate data rather than company data:
 *
 *  1. **A parse is a proposal, never truth.** Auto-filling a profile from a PDF
 *     and treating the result as fact is the same mistake as printing a guessed
 *     runway. Parsed values stay unconfirmed until the candidate accepts them,
 *     and only confirmed values reach matching.
 *
 *  2. **The parser never infers what the document does not say.** Team size at
 *     joining and company stage are the highest-value trajectory signals (§6.2)
 *     and are almost never written down — which makes them exactly what a model
 *     will happily invent from a company's reputation. Null is the correct
 *     answer; our own funding data can enrich later, with provenance attached.
 */

const roleFamilySchema = z.enum(roleFamilyEnum.enumValues);
const senioritySchema = z.enum(seniorityEnum.enumValues);
const startupStageSchema = z.enum(startupStageEnum.enumValues);

/** `YYYY-MM`, the finest granularity a résumé reliably carries. */
const yearMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "expected YYYY-MM");

export const parsedExperienceSchema = z.object({
  companyName: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  /** Null unless the résumé states it. Never inferred from the company name. */
  companyStageAtJoin: startupStageSchema.nullable(),
  /** Null unless the résumé states it. */
  teamSizeAtJoin: z.number().int().positive().max(100_000).nullable(),
  startedAt: yearMonthSchema.nullable(),
  endedAt: yearMonthSchema.nullable(),
  /** Null unless the résumé says so explicitly ("first data hire"). */
  wasFirstInFunction: z.boolean().nullable(),
});

export const parsedResumeSchema = z.object({
  headline: z.string().max(200).nullable(),
  yearsExperience: z.number().int().min(0).max(60).nullable(),
  roleFamilies: z.array(roleFamilySchema).max(4),
  seniority: senioritySchema.nullable(),
  techStack: z.array(z.string().min(1).max(60)).max(40),
  domains: z.array(z.string().min(1).max(60)).max(10),
  experience: z.array(parsedExperienceSchema).max(30),
});

export type ParsedResume = z.infer<typeof parsedResumeSchema>;
export type ParsedExperience = z.infer<typeof parsedExperienceSchema>;

/**
 * A parse result awaiting the candidate's confirmation.
 *
 * `model` and `parsedAt` are kept so a proposal produced by a model we later
 * replace can be identified and re-run rather than silently trusted.
 */
export type ResumeProposal = {
  fields: ParsedResume;
  model: string;
  provider: string;
  parsedAt: Date;
};

export const RESUME_SYSTEM_PROMPT = `You extract structured data from a candidate's résumé for a startup job-matching platform.

Return a single JSON object and nothing else.

Absolute rules:
- Extract only what the résumé states. Never infer, estimate or embellish.
- If a value is not stated, return null (or an empty array for list fields).
- NEVER guess "companyStageAtJoin" from a company's name, size or reputation. Only set it if the résumé explicitly says the funding stage at the time the person joined (e.g. "joined at seed stage").
- NEVER guess "teamSizeAtJoin". Only set it if the résumé states a number (e.g. "third engineer", "team of 8").
- Set "wasFirstInFunction" to true only if the résumé says the person was the first in that discipline (e.g. "first data hire", "founding engineer"). Otherwise null.
- "roleFamilies" must come from this list only: backend, frontend, fullstack, mobile, ml_ai, infra_devops, data, security, engineering_leadership, product_management. Omit anything that does not fit.
- "seniority" must be one of: junior, mid, senior, staff, principal, lead.
- "techStack" is concrete technologies, not soft skills.
- "domains" is the product area, e.g. "developer tools", "fintech", "healthcare".
- Dates are "YYYY-MM" or null.

A missing value is a correct answer. An invented value is a defect.`;

export const buildResumeUserPrompt = (resumeText: string): string =>
  `Résumé text:\n\n${resumeText.trim()}`;

/** Guards against a pathological PDF blowing the model's context. */
const MAX_RESUME_CHARS = 40_000;

export class ResumeParseError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "ResumeParseError";
  }
}

/**
 * Parses résumé text into a proposal.
 *
 * Runs on the `accurate` tier: extracting a salary band or a team size from
 * prose is precisely where a cheap model guesses (§11, hybrid LLM budget). Call
 * this from a Queue consumer, never in a request — `unpdf` extraction plus
 * inference takes seconds (§5.3).
 */
export const parseResume = async (input: {
  resumeText: string;
  provider: LlmProvider;
  model?: string;
}): Promise<ResumeProposal> => {
  const text = input.resumeText.trim();

  if (text.length === 0) {
    throw new ResumeParseError("Résumé text is empty — extraction produced nothing");
  }

  const completion = await input.provider.complete({
    systemPrompt: RESUME_SYSTEM_PROMPT,
    userPrompt: buildResumeUserPrompt(text.slice(0, MAX_RESUME_CHARS)),
    json: true,
    // Extraction, not composition: creativity here means fabrication.
    temperature: 0,
  });

  const raw = parseJsonResponse<unknown>(completion.rawText);
  const result = parsedResumeSchema.safeParse(raw);

  if (!result.success) {
    throw new ResumeParseError(
      `Résumé parse failed validation: ${result.error.issues
        .map((issue) => `${issue.path.join(".")} ${issue.message}`)
        .join("; ")}`,
      result.error,
    );
  }

  return {
    fields: result.data,
    model: completion.model,
    provider: completion.provider,
    parsedAt: new Date(),
  };
};

/**
 * Which proposed fields differ from what the profile already holds.
 *
 * Drives the confirmation UI: the candidate is shown what would change, not a
 * pre-filled form they are nudged into accepting wholesale. A parse that
 * silently overwrote a value the candidate had corrected by hand would be the
 * same failure as trusting the parse in the first place.
 */
export const proposedChanges = (input: {
  proposal: ParsedResume;
  current: Partial<Pick<ParsedResume, "headline" | "yearsExperience" | "seniority" | "roleFamilies" | "techStack">>;
}): string[] => {
  const changes: string[] = [];
  const { proposal, current } = input;

  const differs = (a: unknown, b: unknown) => JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);

  if (proposal.headline !== null && differs(proposal.headline, current.headline)) {
    changes.push("headline");
  }
  if (proposal.yearsExperience !== null && differs(proposal.yearsExperience, current.yearsExperience)) {
    changes.push("yearsExperience");
  }
  if (proposal.seniority !== null && differs(proposal.seniority, current.seniority)) {
    changes.push("seniority");
  }
  if (proposal.roleFamilies.length > 0 && differs(proposal.roleFamilies, current.roleFamilies)) {
    changes.push("roleFamilies");
  }
  if (proposal.techStack.length > 0 && differs(proposal.techStack, current.techStack)) {
    changes.push("techStack");
  }

  return changes;
};
