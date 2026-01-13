import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { createAuthClient } from "better-auth/react";
import { db } from "../db/index";

const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";

// Server-side Better Auth instance
export const auth = betterAuth({
  baseURL,
  database: drizzleAdapter(db, {
    provider: "pg",
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
  },
  plugins: [tanstackStartCookies()], // Must be the last plugin
});

// Client-side auth (for React components)
export const authClient = createAuthClient({
  baseURL,
});
