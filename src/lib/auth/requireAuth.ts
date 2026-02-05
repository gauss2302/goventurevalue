import { redirect } from "@tanstack/react-router";
import type { ParsedLocation } from "@tanstack/router-core";

const isSafeNextPath = (next: string | null | undefined) => {
  if (!next) return false;
  if (!next.startsWith("/")) return false;
  if (next.startsWith("//")) return false;
  if (next.includes("://")) return false;
  return true;
};

const getNextFromLocation = (location: ParsedLocation | null | undefined) => {
  const next = location?.href;
  return isSafeNextPath(next) ? next : null;
};

const extractSession = (result: any) => {
  if (!result) return null;
  if (typeof result === "object" && "data" in result) {
    return (result as { data?: any }).data ?? null;
  }
  return result;
};

const getServerSessionSafe = async (headers: Headers) => {
  const { getServerSession } = await import("@/lib/auth/server");
  return getServerSession(headers);
};

export const getSessionForLoader = async () => {
  if (typeof window === "undefined") {
    const { getRequestHeaders } = await import("@tanstack/react-start/server");
    const headers = getRequestHeaders();
    return getServerSessionSafe(headers);
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

export const requireAuthFromHeaders = async (headers: Headers) => {
  const session = await getServerSessionSafe(headers);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
};

export const requireAuthFromHeadersAndLocation = async (
  headers: Headers,
  location: ParsedLocation,
) => {
  const session = await getServerSessionSafe(headers);
  if (!session?.user) {
    const next = getNextFromLocation(location) || "/dashboard";
    throw redirect({ to: "/auth/signin", search: { next } });
  }
  return session;
};
