/**
 * Runtime environment access.
 *
 * On Cloudflare Workers, bindings (Hyperdrive, KV, R2, Queues, AI) live only on
 * the `env` object and several of them — Hyperdrive above all — are readable
 * only inside a request context. Reading them at module scope throws.
 *
 * Every accessor here is therefore a *function*, called per request. Nothing in
 * this module runs at import time. This is the constraint that forces the
 * per-request `db` and `auth` factories (docs/PRODUCT_PLAN.md §5.3).
 *
 * String config falls back to `process.env` so that local tooling which never
 * enters a Worker request — `drizzle-kit`, unit tests — still works. Bindings
 * have no such fallback: there is no meaningful substitute for them.
 */

import { env as cloudflareEnv } from "cloudflare:workers";

/** Reads a string from Worker vars/secrets, falling back to process.env. */
const readString = (key: string): string | null => {
  const fromBinding = (cloudflareEnv as unknown as Record<string, unknown>)[key];
  if (typeof fromBinding === "string" && fromBinding.trim().length > 0) {
    return fromBinding.trim();
  }

  // `process` exists thanks to nodejs_compat, and is what local tooling uses.
  const fromProcess = typeof process !== "undefined" ? process.env?.[key] : undefined;
  if (typeof fromProcess === "string" && fromProcess.trim().length > 0) {
    return fromProcess.trim();
  }

  return null;
};

export const optionalEnv = (key: string): string | null => readString(key);

export const requireEnv = (key: string): string => {
  const value = readString(key);
  if (!value) {
    throw new Error(`[env] Missing required environment variable: ${key}`);
  }
  return value;
};

export const optionalEnvList = (key: string): string[] | undefined => {
  const raw = readString(key);
  if (!raw) {
    return undefined;
  }
  const items = raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return items.length > 0 ? items : undefined;
};

/**
 * Postgres connection string.
 *
 * Prefers the Hyperdrive binding — that is the whole point of Hyperdrive, it
 * pools connections at the edge. `DATABASE_URL` is the escape hatch for
 * `drizzle-kit` and for tests, which run outside a Worker.
 */
export const getConnectionString = (): string => {
  const hyperdrive = cloudflareEnv.HYPERDRIVE;
  if (hyperdrive?.connectionString) {
    return hyperdrive.connectionString;
  }

  const direct = readString("DATABASE_URL");
  if (direct) {
    return direct;
  }

  throw new Error(
    "[env] No database connection available: HYPERDRIVE binding is absent and DATABASE_URL is unset.",
  );
};

export const getCache = (): KVNamespace => {
  const cache = cloudflareEnv.CACHE;
  if (!cache) {
    throw new Error("[env] KV binding CACHE is not available.");
  }
  return cache;
};

/** KV is optional for session caching — absence degrades performance, not correctness. */
export const getOptionalCache = (): KVNamespace | null => cloudflareEnv.CACHE ?? null;

export const getFiles = (): R2Bucket => {
  const files = cloudflareEnv.FILES;
  if (!files) {
    throw new Error("[env] R2 binding FILES is not available.");
  }
  return files;
};

export const getJobsQueue = (): Queue => {
  const queue = cloudflareEnv.JOBS_QUEUE;
  if (!queue) {
    throw new Error("[env] Queue binding JOBS_QUEUE is not available.");
  }
  return queue;
};

export const getOptionalAi = (): Ai | null => cloudflareEnv.AI ?? null;

/** Config for the LLM provider resolver, assembled per request. */
export const getLlmEnv = () => ({
  ai: getOptionalAi() ?? undefined,
  workersAiModel: optionalEnv("WORKERS_AI_MODEL") ?? undefined,
  openAiApiKey: optionalEnv("OPENAI_API_KEY") ?? undefined,
  openAiModel: optionalEnv("OPENAI_MODEL") ?? undefined,
  geminiApiKey: optionalEnv("GEMINI_API_KEY") ?? undefined,
  geminiModel: optionalEnv("GEMINI_MODEL") ?? undefined,
  geminiApiVersion: optionalEnv("GEMINI_API_VERSION") ?? undefined,
  geminiModelFallbacks: optionalEnvList("GEMINI_MODEL_FALLBACKS"),
});

export const getAppUrl = (): string => {
  const url = optionalEnv("BETTER_AUTH_URL") ?? optionalEnv("VITE_BETTER_AUTH_URL");
  if (!url) {
    throw new Error("[env] Missing BETTER_AUTH_URL (or VITE_BETTER_AUTH_URL).");
  }
  return url.replace(/\/+$/, "");
};
