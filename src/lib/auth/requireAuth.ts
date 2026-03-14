import { redirect } from "@tanstack/react-router";
import type { ParsedLocation } from "@tanstack/react-router";

import { getSession } from "@/lib/auth/rootAuth";

const getNextFromLocation = (location: ParsedLocation | null | undefined) => {
  const next = location?.href;
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("://")) {
    return null;
  }
  return next;
};

const extractSession = (result: unknown) => {
  if (!result) return null;
  if (typeof result === "object" && result !== null && "data" in result) {
    return (result as { data?: unknown }).data ?? null;
  }
  return result;
};

export const getSessionForLoader = async () => {
  if (import.meta.env.SSR) {
    return getSession();
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
