import { DEFAULT_TEMPERATURE, type LlmProvider, type LlmRequest } from "@/lib/ai/types";

/**
 * Workers AI provider — the `cheap` tier (docs/PRODUCT_PLAN.md §11).
 *
 * Used for high-volume, low-stakes classification during ingest. Runs on the
 * `AI` binding, so there is no API key and no egress cost.
 */

/** Minimal structural type for the AI binding, so this module does not depend
 *  on generated worker types being present. */
export type WorkersAiBinding = {
  run: (
    model: string,
    input: Record<string, unknown>,
  ) => Promise<unknown>;
};

export type WorkersAiProviderConfig = {
  binding: WorkersAiBinding;
  /** e.g. "@cf/meta/llama-3.1-8b-instruct" */
  model: string;
};

export const createWorkersAiProvider = ({
  binding,
  model,
}: WorkersAiProviderConfig): LlmProvider => ({
  name: "workers-ai",

  async complete({ systemPrompt, userPrompt, json, temperature }: LlmRequest) {
    const result = (await binding.run(model, {
      temperature: temperature ?? DEFAULT_TEMPERATURE,
      ...(json ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    })) as { response?: string } | string;

    const rawText = typeof result === "string" ? result : result?.response;

    if (typeof rawText !== "string" || rawText.trim().length === 0) {
      throw new Error("[ai/workers-ai] returned empty content");
    }

    return { rawText, provider: "workers-ai", model };
  },
});

/**
 * Embedding model for candidate/job vectors.
 *
 * 768 dimensions — must stay in sync with the `vector(768)` columns in
 * src/db/schema.ts. Changing the model means a migration plus a re-embed of
 * every row, so this constant is the single source of truth.
 */
export const EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5";
export const EMBEDDING_DIMENSIONS = 768;

export const embedText = async (
  binding: WorkersAiBinding,
  texts: string[],
): Promise<number[][]> => {
  if (texts.length === 0) {
    return [];
  }

  const result = (await binding.run(EMBEDDING_MODEL, { text: texts })) as {
    data?: number[][];
  };

  const vectors = result?.data;
  if (!Array.isArray(vectors) || vectors.length !== texts.length) {
    throw new Error(
      `[ai/workers-ai] embedding returned ${vectors?.length ?? 0} vectors for ${texts.length} inputs`,
    );
  }

  for (const vector of vectors) {
    if (vector.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `[ai/workers-ai] embedding dimension mismatch: got ${vector.length}, schema expects ${EMBEDDING_DIMENSIONS}`,
      );
    }
  }

  return vectors;
};
