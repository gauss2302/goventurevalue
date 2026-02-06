import type { PitchDeckGenerationInput } from "@/lib/pitchDeck/types";

export type ProviderGenerationResult = {
  rawText: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

export type PitchDeckProvider = {
  generate: (params: {
    model: string;
    input: PitchDeckGenerationInput;
    systemPrompt: string;
    userPrompt: string;
  }) => Promise<ProviderGenerationResult>;
};
