/**
 * Generic LLM provider abstraction.
 *
 * Adapted from the pitch-deck provider layer of the previous product. Two
 * deliberate changes for Cloudflare Workers:
 *
 *   1. No `process.env` reads. Configuration is injected by the caller, because
 *      on Workers bindings and secrets are only reachable through `env` inside a
 *      request context (see docs/PRODUCT_PLAN.md §5.3).
 *   2. The request shape is task-agnostic instead of pitch-deck specific, so the
 *      same providers serve job normalization, enrichment and candidate-facing
 *      AI features.
 */

export type LlmUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type LlmCompletion = {
  rawText: string;
  usage?: LlmUsage;
  /** Provider that actually served the request, for cost attribution. */
  provider: string;
  /** Model that actually served the request — may differ from the one asked
   *  for when a provider falls back (see the Gemini provider). */
  model: string;
};

export type LlmRequest = {
  systemPrompt: string;
  userPrompt: string;
  /** Ask the provider to constrain output to a JSON object. */
  json?: boolean;
  temperature?: number;
};

export type LlmProvider = {
  readonly name: string;
  complete: (request: LlmRequest) => Promise<LlmCompletion>;
};

/**
 * Which class of model a task needs.
 *
 * `cheap`    — high-volume, low-stakes classification (role family, seniority,
 *              remote policy). Runs on Workers AI.
 * `accurate` — extraction from free text where quality visibly matters (salary
 *              bands, equity, tech stack, team size). Runs on an external model.
 *
 * Rationale in docs/PRODUCT_PLAN.md §11 (hybrid LLM budget).
 */
export type LlmTier = "cheap" | "accurate";

export const DEFAULT_TEMPERATURE = 0.2;
