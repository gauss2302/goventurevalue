import { createServerFn } from "@tanstack/react-start";

import { logger } from "@/lib/logger";
import { optionalEnv } from "@/lib/env";

const isProduction = () =>
  (optionalEnv("APP_ENV") ?? optionalEnv("NODE_ENV")) === "production";

type BillingFlowInput = {
  returnPath?: string | null;
};

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, "");

export const sanitizeReturnPath = (value: string | null | undefined): string => {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  if (value.includes("://")) return "/";
  return value;
};

export const getRequestOrigin = (headers: Headers): string => {
  const configuredOrigin =
    optionalEnv("BETTER_AUTH_URL") ?? optionalEnv("VITE_BETTER_AUTH_URL");

  // In production, prefer the configured origin over request headers so a
  // forged Host / X-Forwarded-Host can't shape outgoing redirect URLs.
  if (isProduction() && configuredOrigin) {
    return normalizeBaseUrl(configuredOrigin);
  }

  const forwardedProto = headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const forwardedHost = headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = forwardedHost || headers.get("host")?.trim();

  if (host) {
    const defaultProto = isProduction() ? "https" : "http";
    const proto = forwardedProto || defaultProto;
    return `${proto}://${host}`;
  }

  if (configuredOrigin) {
    return normalizeBaseUrl(configuredOrigin);
  }

  if (!isProduction()) {
    return "http://localhost:3000";
  }

  throw new Error(
    "Unable to determine request origin. Configure BETTER_AUTH_URL.",
  );
};

const resolveReturnUrl = (headers: Headers, returnPath?: string | null): string => {
  const origin = getRequestOrigin(headers);
  return `${origin}${sanitizeReturnPath(returnPath)}`;
};

const resolveCheckoutSuccessUrl = (headers: Headers): string => {
  const origin = getRequestOrigin(headers);
  return `${origin}/billing/success`;
};

const billingInputValidator = (data: BillingFlowInput | undefined): BillingFlowInput => ({
  returnPath: data?.returnPath ?? null,
});

export const startBillingCheckout = createServerFn({ method: "POST" })
  .inputValidator(billingInputValidator)
  .handler(async ({ data }) => {
    const [
      { getRequestHeaders },
      { requireAuthFromHeaders },
      { createCheckoutForUser },
    ] = await Promise.all([
      import("@tanstack/react-start/server"),
      import("@/lib/auth/server"),
      import("@/lib/billing/polar"),
    ]);

    const headers = getRequestHeaders();
    const session = await requireAuthFromHeaders(headers);

    try {
      const url = await createCheckoutForUser({
        userId: session.user.id,
        successUrl: resolveCheckoutSuccessUrl(headers),
        returnUrl: resolveReturnUrl(headers, data.returnPath),
      });

      return { url };
    } catch (error) {
      logger.error("[Billing] Failed to create checkout:", error);
      throw new Error("Unable to start checkout. Please try again.");
    }
  });

export const openBillingPortal = createServerFn({ method: "POST" })
  .inputValidator(billingInputValidator)
  .handler(async ({ data }) => {
    const [
      { getRequestHeaders },
      { requireAuthFromHeaders },
      {
        createPortalForUser,
        createCheckoutForUser,
        getCustomerStateExternal,
      },
    ] = await Promise.all([
      import("@tanstack/react-start/server"),
      import("@/lib/auth/server"),
      import("@/lib/billing/polar"),
    ]);

    const headers = getRequestHeaders();
    const session = await requireAuthFromHeaders(headers);

    try {
      const customerState = await getCustomerStateExternal(session.user.id);

      if (customerState) {
        const url = await createPortalForUser({
          userId: session.user.id,
          returnUrl: resolveReturnUrl(headers, data.returnPath),
        });
        return { url };
      }

      const url = await createCheckoutForUser({
        userId: session.user.id,
        successUrl: resolveCheckoutSuccessUrl(headers),
        returnUrl: resolveReturnUrl(headers, data.returnPath),
      });
      return { url };
    } catch (error) {
      logger.error("[Billing] Failed to open billing portal or checkout:", error);
      throw new Error("Unable to open billing. Please try again.");
    }
  });
