import { DECK_SLIDE_ORDER } from "@/lib/pitchDeck/types";
import type { PitchDeckGenerationInput } from "@/lib/pitchDeck/types";

const compact = (value: string | undefined | null) => (value ?? "").trim();

export const buildPitchDeckSystemPrompt = () => {
  const slideGuide = DECK_SLIDE_ORDER.map((slide, index) => `${index + 1}. ${slide.label} (${slide.type})`).join("\n");

  return [
    "You are an expert startup fundraising consultant and pitch deck writer.",
    "Generate an investor-grade pitch deck as JSON only.",
    "Return valid JSON with shape:",
    '{"slides":[{"type":"cover","heading":"","subheading":"","bullets":[],"speakerNotes":""}]}',
    "Constraints:",
    "- Exactly 10 slides, in this order:",
    slideGuide,
    "- Keep each heading <= 90 chars.",
    "- Keep subheading <= 180 chars.",
    "- 3 to 6 concise bullets per slide.",
    "- Each bullet <= 140 chars.",
    "- Speaker notes should be concrete and practical.",
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
