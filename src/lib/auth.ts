import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { createAuthClient } from "better-auth/react";
import { db } from "../db/index";
import * as schema from "../db/schema";

const resolveBaseURL = () => {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return (
    process.env.BETTER_AUTH_URL ||
    process.env.VITE_BETTER_AUTH_URL ||
    import.meta.env?.VITE_BETTER_AUTH_URL ||
    "http://localhost:3000"
  );
};

const baseURL = resolveBaseURL();
const isMockAuth = process.env.MOCK_AUTH === "true";

const secret =
  process.env.BETTER_AUTH_SECRET ||
  (isMockAuth
    ? "dev-secret-key-change-in-production"
    : "change-me-in-production-secret-key");

// Debug logging (only in development)
if (process.env.NODE_ENV !== "production") {
  console.log("🔐 Better Auth Configuration:");
  console.log("  - Base URL:", baseURL);
  console.log("  - Mock Auth:", isMockAuth);
  console.log("  - Secret:", secret ? "✅ Set" : "❌ Not set");
  console.log(
    "  - Google Client ID:",
    process.env.GOOGLE_CLIENT_ID ? "✅ Set" : "❌ Not set"
  );
  console.log(
    "  - Google Client Secret:",
    process.env.GOOGLE_CLIENT_SECRET ? "✅ Set" : "❌ Not set"
  );
  console.log(
    "  - Database URL:",
    process.env.DATABASE_URL ? "✅ Set" : "❌ Not set"
  );
}

if (!secret && !isMockAuth) {
  console.warn(
    "⚠️  BETTER_AUTH_SECRET is not set. Authentication may not work properly."
  );
}

const mockUser = {
  id: "mock-user",
  name: "Demo User",
  email: "demo@goventurevalue.com",
  image: null,
};

const mockSession = {
  user: mockUser,
  session: {
    token: "mock-token",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  },
};

// Server-side Better Auth instance
export const auth = betterAuth({
  baseURL,
  secret,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema, // Pass the schema so Better Auth can find the tables
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production with email service
    minPasswordLength: 8, // Match the form validation
    autoSignIn: true, // Automatically sign in after signup
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  plugins: [tanstackStartCookies()],
});

// Client-side auth (for React components)
export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: "include", // Important for cookies to work with TanStack Start
  },
});

// Helpers for dev-only mock auth
export const getServerSession = async (headers?: Headers) => {
  if (isMockAuth) {
    return mockSession;
  }

  return auth.api.getSession({ headers: headers || new Headers() });
};

export const useSessionWithMock = () => {
  const clientSession = authClient.useSession();
  const isClientMock =
    isMockAuth ||
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_MOCK_AUTH === "true");

  if (isClientMock) {
    return {
      ...clientSession,
      data: mockSession,
      error: null,
      isPending: false,
    };
  }

  return clientSession;
};

export const signOutWithMock = () => {
  const isClientMock =
    isMockAuth ||
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_MOCK_AUTH === "true");
  if (isClientMock) {
    return Promise.resolve();
  }
  return authClient.signOut();
};
