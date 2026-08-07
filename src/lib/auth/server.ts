/**
 * Per-request Better Auth factory.
 *
 * The previous product built a module-scope `betterAuth(...)` from `process.env`.
 * On Workers that throws, because the Drizzle adapter needs a database handle
 * and the Hyperdrive binding behind it only exists inside a request context
 * (docs/PRODUCT_PLAN.md §5.3, blocker #1).
 *
 * So the auth instance is constructed per request. To keep that affordable,
 * sessions are cached in KV as Better Auth's `secondaryStorage`, which removes
 * a database round trip from most authenticated requests.
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { checkout, polar } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";

import { openDb, schema, type Database } from "@/db/index";
import { getAppUrl, getOptionalCache, optionalEnv, requireEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;
const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24;

/**
 * KV-backed secondary storage for sessions.
 *
 * Sessions are the one thing where KV's eventual consistency is acceptable —
 * a stale read costs at most one extra database lookup. Contrast with the
 * application quota (§3.2), which is load-bearing and therefore lives in
 * Postgres.
 */
const createSecondaryStorage = (cache: KVNamespace) => ({
  get: async (key: string) => cache.get(key),
  set: async (key: string, value: string, ttl?: number) => {
    // KV rejects TTLs below 60s; fall back to no expiry and let Better Auth
    // overwrite the value rather than silently failing the write.
    await cache.put(key, value, ttl && ttl >= 60 ? { expirationTtl: ttl } : undefined);
  },
  delete: async (key: string) => {
    await cache.delete(key);
  },
});

const createPolarPlugin = () => {
  const accessToken = optionalEnv("POLAR_ACCESS_TOKEN");
  const productId = optionalEnv("POLAR_GROWTH_PRODUCT_ID");

  if (!accessToken || !productId) {
    return null;
  }

  const successUrl = optionalEnv("POLAR_SUCCESS_URL") ?? `${getAppUrl()}/billing/success`;
  const slug = optionalEnv("POLAR_CHECKOUT_SLUG") ?? "growth";
  const server = optionalEnv("POLAR_SERVER")?.toLowerCase() === "production"
    ? "production"
    : "sandbox";

  return polar({
    client: new Polar({ accessToken, server }),
    createCustomerOnSignUp: true,
    use: [
      checkout({
        products: [{ productId, slug }],
        successUrl,
        authenticatedUsersOnly: true,
      }),
    ],
  });
};

export type Auth = ReturnType<typeof createAuth>;

/** Builds an auth instance bound to an already-open database handle. */
export const createAuth = (db: Database) => {
  const cache = getOptionalCache();
  const polarPlugin = createPolarPlugin();

  return betterAuth({
    baseURL: getAppUrl(),
    secret: requireEnv("BETTER_AUTH_SECRET"),
    database: drizzleAdapter(db, { provider: "pg", schema }),
    ...(cache ? { secondaryStorage: createSecondaryStorage(cache) } : {}),
    socialProviders: {
      google: {
        clientId: requireEnv("GOOGLE_CLIENT_ID"),
        clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      autoSignIn: true,
    },
    session: {
      expiresIn: SESSION_EXPIRES_IN_SECONDS,
      updateAge: SESSION_UPDATE_AGE_SECONDS,
    },
    plugins: [tanstackStartCookies(), ...(polarPlugin ? [polarPlugin] : [])],
  });
};

/**
 * Runs `fn` with an auth instance, closing the database connection afterwards.
 *
 * Unlike {@link withDb}, teardown is awaited rather than deferred: Better Auth
 * writes session rows during the request, and closing before those settle would
 * abort them.
 */
export const withAuth = async <T>(fn: (auth: Auth) => Promise<T>): Promise<T> => {
  const { db, close } = await openDb();
  try {
    return await fn(createAuth(db));
  } finally {
    await close();
  }
};

export const getServerSession = async (headers?: Headers) =>
  withAuth((auth) => auth.api.getSession({ headers: headers ?? new Headers() }));

export const requireAuthFromHeaders = async (headers: Headers) => {
  const session = await getServerSession(headers);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
};

/** Handles a Better Auth HTTP request (used by the /api/auth/$ route). */
export const handleAuthRequest = async (request: Request): Promise<Response> => {
  try {
    return await withAuth((auth) => auth.handler(request));
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    logger.error("[auth] request failed", error);
    return new Response(JSON.stringify({ error: "Authentication error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
