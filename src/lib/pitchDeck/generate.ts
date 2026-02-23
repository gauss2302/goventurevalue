import {
  buildPitchDeckFullAiSystemPrompt,
  buildPitchDeckFullAiUserPrompt,
  buildPitchDeckSystemPrompt,
  buildPitchDeckUserPrompt,
} from "@/lib/pitchDeck/prompt";
import { normalizePitchDeckFullAiResponse, normalizePitchDeckSlides } from "@/lib/pitchDeck/normalize";
import { openAiPitchDeckProvider } from "@/lib/pitchDeck/providers/openai";
import { geminiPitchDeckProvider } from "@/lib/pitchDeck/providers/gemini";
import type {
  PitchDeckFullAiGenerationInput,
  PitchDeckFullAiGenerationResult,
  PitchDeckGenerationRequest,
  PitchDeckGenerationResult,
} from "@/lib/pitchDeck/types";

const providerDefaults = {
  openai: process.env.OPENAI_PITCH_MODEL || "gpt-4.1-mini",
  gemini: process.env.GEMINI_PITCH_MODEL || "gemini-2.0-flash",
} as const;

const providerMap = {
  openai: openAiPitchDeckProvider,
  gemini: geminiPitchDeckProvider,
} as const;

export const resolveProviderModel = (provider: "openai" | "gemini", providerModel?: string) => {
  const trimmed = providerModel?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : providerDefaults[provider];
};

export const generatePitchDeck = async (
  request: PitchDeckGenerationRequest,
): Promise<PitchDeckGenerationResult> => {
  const providerModel = resolveProviderModel(request.provider, request.providerModel);
  const provider = providerMap[request.provider];

  if (!provider) {
    throw new Error(`Unsupported provider: ${request.provider}`);
  }

  const systemPrompt = buildPitchDeckSystemPrompt();
  const userPrompt = buildPitchDeckUserPrompt(request.input);

  const generated = await provider.generate({
    model: providerModel,
    input: request.input,
    systemPrompt,
    userPrompt,
  });

  const slides = normalizePitchDeckSlides(generated.rawText);

  return {
    slides,
    generationMeta: {
      provider: request.provider,
      providerModel,
      generatedAt: new Date().toISOString(),
      usage: generated.usage,
    },
  };
};

/** Full AI slides: Gemini only, returns slides + style instructions. */
export const generatePitchDeckFullAi = async (
  input: PitchDeckFullAiGenerationInput,
): Promise<PitchDeckFullAiGenerationResult> => {
  const providerModel = resolveProviderModel("gemini", undefined);
  const provider = geminiPitchDeckProvider;

  const systemPrompt = buildPitchDeckFullAiSystemPrompt();
  const userPrompt = buildPitchDeckFullAiUserPrompt(input);

  const generated = await provider.generate({
    model: providerModel,
    input,
    systemPrompt,
    userPrompt,
  });

  const { slides, styleInstructions } = normalizePitchDeckFullAiResponse(generated.rawText);

  return {
    slides,
    styleInstructions,
    generationMeta: {
      provider: "gemini",
      providerModel,
      generatedAt: new Date().toISOString(),
      usage: generated.usage,
    },
  };
};
