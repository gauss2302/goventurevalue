import { createServerFn } from "@tanstack/react-start";

import { logger } from "@/lib/logger";

type BillingFlowInput = {
  returnPath?: string | null;
};

export type ExportAccessResult =
  | { allowed: true }
  | { allowed: false; checkoutUrl: string };

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, "");

export const sanitizeReturnPath = (value: string | null | undefined): string => {
  if (!value) return "/dashboard";
  if (!value.startsWith("/")) return "/dashboard";
  if (value.startsWith("//")) return "/dashboard";
  if (value.includes("://")) return "/dashboard";
  return value;
};

export const getRequestOrigin = (headers: Headers): string => {
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
    const proto = forwardedProto || "http";
    return `${proto}://${host}`;
  }

  const configuredOrigin =
    process.env.BETTER_AUTH_URL || process.env.VITE_BETTER_AUTH_URL;
  if (configuredOrigin) {
    return normalizeBaseUrl(configuredOrigin);
  }

  if (process.env.NODE_ENV !== "production") {
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

export const assertExportAccess = createServerFn({ method: "POST" })
  .inputValidator(billingInputValidator)
  .handler(async ({ data }) => {
    const [
      { getRequestHeaders },
      { requireAuthFromHeaders },
      { ensureFreshBillingSnapshot, isExportEntitled },
      { createCheckoutForUser },
    ] = await Promise.all([
      import("@tanstack/react-start/server"),
      import("@/lib/auth/server"),
      import("@/lib/billing/subscription"),
      import("@/lib/billing/polar"),
    ]);

    const headers = getRequestHeaders();
    const session = await requireAuthFromHeaders(headers);

    try {
      const snapshot = await ensureFreshBillingSnapshot(session.user.id);
      if (isExportEntitled(snapshot)) {
        return { allowed: true } satisfies ExportAccessResult;
      }

      const checkoutUrl = await createCheckoutForUser({
        userId: session.user.id,
        successUrl: resolveCheckoutSuccessUrl(headers),
        returnUrl: resolveReturnUrl(headers, data.returnPath),
      });

      return {
        allowed: false,
        checkoutUrl,
      } satisfies ExportAccessResult;
    } catch (error) {
      logger.error("[Billing] Failed to verify export entitlement:", error);
      throw new Error("Could not verify subscription. Please try again.");
    }
  });
