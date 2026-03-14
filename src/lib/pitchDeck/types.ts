import type {
  AIProvider,
  PitchDeckAiStyleInstructions,
  PitchDeckBriefDto,
  PitchDeckSlideDto,
  PitchDeckSlideTypeDto,
  PitchDeckStyleQuestionnaireInput,
} from "@/lib/dto";

export type DeckSlideTemplate = {
  type: PitchDeckSlideTypeDto;
  label: string;
};

export const DECK_SLIDE_ORDER: DeckSlideTemplate[] = [
  { type: "cover", label: "Cover" },
  { type: "problem", label: "Problem" },
  { type: "solution", label: "Solution" },
  { type: "market", label: "Market" },
  { type: "product", label: "Product" },
  { type: "traction", label: "Traction" },
  { type: "business-model", label: "Business Model" },
  { type: "go-to-market", label: "Go-To-Market" },
  { type: "financials", label: "Financials" },
  { type: "ask", label: "Ask" },
];

export type ModelContextSummary = {
  modelName: string;
  currency: string;
  companyName: string | null;
  description: string | null;
  baseScenario?: {
    userGrowth: number;
    arpu: number;
    churnRate: number;
    expansionRate: number;
    grossMarginTarget: number;
    cac: number;
  };
  keySettings?: {
    startUsers: number;
    taxRate: number;
    discountRate: number;
    terminalGrowth: number;
  };
};

export type PitchDeckGenerationInput = {
  title: string;
  startupName: string;
  oneLiner?: string;
  audience: string;
  language: string;
  currency: string;
  brief: PitchDeckBriefDto;
  modelContext?: ModelContextSummary | null;
};

export type PitchDeckGenerationRequest = {
  provider: AIProvider;
  providerModel: string;
  input: PitchDeckGenerationInput;
};

export type PitchDeckGenerationResult = {
  slides: PitchDeckSlideDto[];
  generationMeta: {
    provider: AIProvider;
    providerModel: string;
    generatedAt: string;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
  };
};

/** Input for Full AI slides generation (content input + style questionnaire) */
export type PitchDeckFullAiGenerationInput = PitchDeckGenerationInput & {
  styleQuestionnaire: PitchDeckStyleQuestionnaireInput;
};

/** Result of Full AI slides generation: slides + style instructions from Gemini */
export type PitchDeckFullAiGenerationResult = {
  slides: PitchDeckSlideDto[];
  styleInstructions: PitchDeckAiStyleInstructions;
  generationMeta: PitchDeckGenerationResult["generationMeta"];
};

export type { PitchDeckStyleQuestionnaireInput, PitchDeckAiStyleInstructions };
