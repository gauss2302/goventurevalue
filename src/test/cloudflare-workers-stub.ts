/**
 * Test stub for the `cloudflare:workers` virtual module.
 *
 * Aliased in vitest.config.ts. It models running *outside* a Worker, which is a
 * real state the code already handles: no bindings available, string config read
 * from process.env, and `waitUntil` absent.
 *
 * Deliberately not a fake Worker environment. Anything that genuinely needs
 * bindings — Hyperdrive queries, KV, R2, Workers AI — belongs in integration
 * tests against a real Worker, not here.
 */

/** No bindings, exactly as when the code runs under drizzle-kit or vitest. */
export const env = {} as Record<string, unknown>;

/** Absent outside a Worker; callers fall back to awaiting inline. */
export const waitUntil = (_promise: Promise<unknown>): void => {
  throw new Error("[test] waitUntil is unavailable outside a Worker runtime");
};
