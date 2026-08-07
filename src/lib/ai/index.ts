import { createGeminiProvider } from "@/lib/ai/gemini";
import { createOpenAiProvider } from "@/lib/ai/openai";
import { createWorkersAiProvider, type WorkersAiBinding } from "@/lib/ai/workersAi";
import type { LlmProvider, LlmTier } from "@/lib/ai/types";

export type { LlmCompletion, LlmProvider, LlmRequest, LlmTier, LlmUsage } from "@/lib/ai/types";
export { createGeminiProvider } from "@/lib/ai/gemini";
export { createOpenAiProvider } from "@/lib/ai/openai";
export {
  createWorkersAiProvider,
  embedText,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
} from "@/lib/ai/workersAi";

/**
 * Everything the resolver needs, read from the Worker `env` by the caller.
 * Passing a plain object rather than `env` itself keeps this module testable
 * and free of any Cloudflare import.
 */
export type LlmEnv = {
  ai?: WorkersAiBinding;
  workersAiModel?: string;
  openAiApiKey?: string;
  openAiModel?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  geminiApiVersion?: string;
  geminiModelFallbacks?: string[];
};

const DEFAULT_WORKERS_AI_MODEL = "@cf/meta/llama-3.1-8b-instruct";

/**
 * Pick a provider for a task tier.
 *
 * `cheap`    → Workers AI, falling back to an external model only if the AI
 *              binding is absent (local dev without `--remote`).
 * `accurate` → OpenAI, then Gemini. Falls back to Workers AI as a last resort
 *              so ingest degrades in quality rather than stopping outright.
 *
 * See docs/PRODUCT_PLAN.md §11 for why the split exists.
 */
export const resolveLlmProvider = (tier: LlmTier, env: LlmEnv): LlmProvider => {
  const workersAi = env.ai
    ? createWorkersAiProvider({
        binding: env.ai,
        model: env.workersAiModel ?? DEFAULT_WORKERS_AI_MODEL,
      })
    : null;

  const openAi =
    env.openAiApiKey && env.openAiModel
      ? createOpenAiProvider({ apiKey: env.openAiApiKey, model: env.openAiModel })
      : null;

  const gemini =
    env.geminiApiKey && env.geminiModel
      ? createGeminiProvider({
          apiKey: env.geminiApiKey,
          model: env.geminiModel,
          apiVersion: env.geminiApiVersion,
          modelFallbacks: env.geminiModelFallbacks,
        })
      : null;

  const chain = tier === "cheap" ? [workersAi, openAi, gemini] : [openAi, gemini, workersAi];

  const provider = chain.find((candidate): candidate is LlmProvider => candidate !== null);

  if (!provider) {
    throw new Error(
      `[ai] no provider configured for tier "${tier}". Set the AI binding, OPENAI_API_KEY or GEMINI_API_KEY.`,
    );
  }

  return provider;
};

/**
 * Parse a JSON object out of an LLM response, tolerating the markdown fences
 * models add even when asked for raw JSON.
 */
export const parseJsonResponse = <T>(rawText: string): T => {
  const trimmed = rawText.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(unfenced) as T;
  } catch (error) {
    const preview = unfenced.slice(0, 200);
    throw new Error(
      `[ai] response was not valid JSON: ${(error as Error).message}. Received: ${preview}`,
    );
  }
};
