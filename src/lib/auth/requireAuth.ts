import { redirect } from "@tanstack/react-router";
import type { ParsedLocation } from "@tanstack/react-router";

import { getSession } from "@/lib/auth/rootAuth";

export type LoaderSession = {
  user?: {
    id: string;
    email?: string | null;
    name?: string | null;
  };
} | null;

const getNextFromLocation = (location: ParsedLocation | null | undefined) => {
  const next = location?.href;
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\") ||
    next.includes("://")
  ) {
    return null;
  }
  return next;
};

const extractSession = (result: unknown): LoaderSession => {
  if (!result || typeof result !== "object") return null;
  if ("data" in result) {
    const data = (result as { data?: unknown }).data;
    return (data as LoaderSession) ?? null;
  }
  return result as LoaderSession;
};

export const getSessionForLoader = async (): Promise<LoaderSession> => {
  if (import.meta.env.SSR) {
    return (await getSession()) as LoaderSession;
  }
  const { authClient } = await import("@/lib/auth/client");
  const result = await authClient.getSession();
  return extractSession(result);
};

export const requireAuthForLoader = async (location: ParsedLocation) => {
  const session = await getSessionForLoader();
  if (!session?.user) {
    const next = getNextFromLocation(location) || "/dashboard";
    throw redirect({ to: "/auth/signin", search: { next } });
  }
  return session;
};
