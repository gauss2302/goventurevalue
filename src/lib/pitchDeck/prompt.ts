import { DECK_SLIDE_ORDER } from "@/lib/pitchDeck/types";
import type {
  PitchDeckFullAiGenerationInput,
  PitchDeckGenerationInput,
} from "@/lib/pitchDeck/types";

const compact = (value: string | undefined | null) => (value ?? "").trim();

export const buildPitchDeckSystemPrompt = () => {
  const slideGuide = DECK_SLIDE_ORDER.map((slide, index) => `${index + 1}. ${slide.label} (${slide.type})`).join("\n");

  return [
    "You are an expert startup fundraising consultant and pitch deck writer.",
    "Generate a bright, presentation-style investor pitch deck as JSON only.",
    "Return valid JSON with shape:",
    '{"slides":[{"type":"cover","heading":"","subheading":"","bullets":[],"speakerNotes":"","keyMetrics":[],"emphasisBulletIndex":0}]}',
    "Constraints:",
    "- Exactly 10 slides, in this order:",
    slideGuide,
    "- Keep each heading <= 90 chars; make them punchy and memorable.",
    "- Keep subheading <= 180 chars.",
    "- 3 to 6 concise, impactful bullets per slide; each <= 140 chars.",
    "- Speaker notes should be concrete and practical.",
    "- Optional per slide: keyMetrics (array of 1–4 short callouts, e.g. \"$2M ARR\", \"40% MoM\", max ~25 chars each) and emphasisBulletIndex (0-based index of the most important bullet to highlight).",
    "- Use keyMetrics and emphasisBulletIndex where they add impact; omit or use empty array / 0 if not needed.",
    "- Avoid hype and unverifiable claims.",
    "- If data is missing, make conservative assumptions and state them in speaker notes.",
    "- Output JSON only. No markdown, no prose outside JSON.",
  ].join("\n");
};

export const buildPitchDeckUserPrompt = (input: PitchDeckGenerationInput) => {
  const sections = [
    `Title: ${compact(input.title)}`,
    `Startup name: ${compact(input.startupName)}`,
    `One-liner: ${compact(input.oneLiner)}`,
    `Audience: ${compact(input.audience)}`,
    `Language: ${compact(input.language)}`,
    `Currency: ${compact(input.currency)}`,
    "Brief:",
    `- Problem: ${compact(input.brief.problem)}`,
    `- Solution: ${compact(input.brief.solution)}`,
    `- Product: ${compact(input.brief.product)}`,
    `- Market: ${compact(input.brief.market)}`,
    `- Business model: ${compact(input.brief.businessModel)}`,
    `- Traction: ${compact(input.brief.traction)}`,
    `- Go-to-market: ${compact(input.brief.goToMarket)}`,
    `- Competition: ${compact(input.brief.competition)}`,
    `- Financial highlights: ${compact(input.brief.financialHighlights)}`,
    `- Funding ask: ${compact(input.brief.fundingAsk)}`,
  ];

  if (input.modelContext) {
    const model = input.modelContext;
    sections.push(
      "Optional model context:",
      `- Model name: ${compact(model.modelName)}`,
      `- Company: ${compact(model.companyName)}`,
      `- Model description: ${compact(model.description)}`,
      `- Model currency: ${compact(model.currency)}`,
    );

    if (model.baseScenario) {
      sections.push(
        "- Base scenario:",
        `  * User growth: ${model.baseScenario.userGrowth}`,
        `  * ARPU: ${model.baseScenario.arpu}`,
        `  * Churn rate: ${model.baseScenario.churnRate}`,
        `  * Farmer growth: ${model.baseScenario.farmerGrowth}`,
        `  * CAC: ${model.baseScenario.cac}`,
      );
    }

    if (model.keySettings) {
      sections.push(
        "- Key settings:",
        `  * Start users: ${model.keySettings.startUsers}`,
        `  * Start farmers: ${model.keySettings.startFarmers}`,
        `  * Tax rate: ${model.keySettings.taxRate}`,
        `  * Discount rate: ${model.keySettings.discountRate}`,
        `  * Terminal growth: ${model.keySettings.terminalGrowth}`,
      );
    }
  }

  return sections.join("\n");
};

const FULL_AI_JSON_SHAPE = `{
  "slides": [{"type":"cover","heading":"","subheading":"","bullets":[],"speakerNotes":"","keyMetrics":[],"emphasisBulletIndex":0}],
  "styleInstructions": {
    "global": {
      "palette": {"background":"","heading":"","subheading":"","bullets":"","accent":"","footer":"","border":""},
      "typographyPersonality":"",
      "visualDensity":"",
      "motif":"",
      "brandAlignment":"",
      "investorEmphasis":""
    },
    "slideHints": {"cover":{"layoutEmphasis":"","visualMotif":""}}
  }
}`;

export const buildPitchDeckFullAiSystemPrompt = () => {
  const slideGuide = DECK_SLIDE_ORDER.map((slide, index) => `${index + 1}. ${slide.label} (${slide.type})`).join("\n");
  return [
    "You are an expert startup fundraising consultant, pitch deck writer, and presentation designer.",
    "Generate a complete investor pitch deck as JSON only: both slide content AND design style instructions so a platform can render them consistently.",
    "Return valid JSON with this exact shape:",
    FULL_AI_JSON_SHAPE,
    "Content constraints (same as standard deck):",
    "- Exactly 10 slides, in this order:",
    slideGuide,
    "- Keep each heading <= 90 chars; subheading <= 180 chars; 3–6 bullets per slide, each <= 140 chars.",
    "- Speaker notes concrete and practical. Optional per slide: keyMetrics (1–4 short callouts), emphasisBulletIndex (0-based).",
    "Style instructions constraints:",
    "- global.palette: hex colors only (e.g. #1c1e2f). Include: background, heading, subheading, bullets, accent, footer, border.",
    "- global.typographyPersonality: one of modern, classic, technical, editorial.",
    "- global.visualDensity: one of minimal, balanced, dense.",
    "- global.motif: short phrase (e.g. clean lines, data-driven, warm trust).",
    "- global.brandAlignment: strict-brand-like or exploratory.",
    "- global.investorEmphasis: credibility-first, growth-first, or disruption-first.",
    "- slideHints: optional per slide type (cover, problem, solution, market, product, traction, business-model, go-to-market, financials, ask). Each can have layoutEmphasis and visualMotif (short strings).",
    "Output JSON only. No markdown, no prose outside JSON.",
  ].join("\n");
};

export const buildPitchDeckFullAiUserPrompt = (input: PitchDeckFullAiGenerationInput) => {
  const contentSections = [
    `Title: ${compact(input.title)}`,
    `Startup name: ${compact(input.startupName)}`,
    `One-liner: ${compact(input.oneLiner)}`,
    `Audience: ${compact(input.audience)}`,
    `Language: ${compact(input.language)}`,
    `Currency: ${compact(input.currency)}`,
    "Brief:",
    `- Problem: ${compact(input.brief.problem)}`,
    `- Solution: ${compact(input.brief.solution)}`,
    `- Product: ${compact(input.brief.product)}`,
    `- Market: ${compact(input.brief.market)}`,
    `- Business model: ${compact(input.brief.businessModel)}`,
    `- Traction: ${compact(input.brief.traction)}`,
    `- Go-to-market: ${compact(input.brief.goToMarket)}`,
    `- Competition: ${compact(input.brief.competition)}`,
    `- Financial highlights: ${compact(input.brief.financialHighlights)}`,
    `- Funding ask: ${compact(input.brief.fundingAsk)}`,
  ];

  if (input.modelContext) {
    const model = input.modelContext;
    contentSections.push(
      "Optional model context:",
      `- Model name: ${compact(model.modelName)}`,
      `- Company: ${compact(model.companyName)}`,
      `- Model description: ${compact(model.description)}`,
      `- Model currency: ${compact(model.currency)}`,
    );
    if (model.baseScenario) {
      contentSections.push(
        "- Base scenario:",
        `  * User growth: ${model.baseScenario.userGrowth}, ARPU: ${model.baseScenario.arpu}, Churn: ${model.baseScenario.churnRate}, Farmer growth: ${model.baseScenario.farmerGrowth}, CAC: ${model.baseScenario.cac}`,
      );
    }
    if (model.keySettings) {
      contentSections.push(
        "- Key settings:",
        `  * Start users: ${model.keySettings.startUsers}, Start farmers: ${model.keySettings.startFarmers}, Tax: ${model.keySettings.taxRate}, Discount: ${model.keySettings.discountRate}, Terminal growth: ${model.keySettings.terminalGrowth}`,
      );
    }
  }

  const q = input.styleQuestionnaire ?? {};
  const styleSections = [
    "Style questionnaire from user (use these to drive styleInstructions):",
    `- Color direction: ${compact(q.colorDirection)}`,
    `- Imagery style: ${compact(q.imageryStyle)}`,
    `- Visual density: ${compact(q.visualDensity)}`,
    `- Typography personality: ${compact(q.typographyPersonality)}`,
    `- Brand alignment: ${compact(q.brandAlignment)}`,
    `- Investor risk/emphasis: ${compact(q.investorRiskProfile)}`,
    `- Optional note: ${compact(q.optionalNote)}`,
  ];

  return [...contentSections, "", ...styleSections].join("\n");
};
