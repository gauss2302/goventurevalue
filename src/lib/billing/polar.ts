import { Polar } from "@polar-sh/sdk";
import { PolarError } from "@polar-sh/sdk/models/errors/polarerror";
import type { CustomerState } from "@polar-sh/sdk/models/components/customerstate";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";

import { optionalEnv } from "@/lib/env";

const POLAR_SERVER_VALUES = ["sandbox", "production"] as const;
type PolarServer = (typeof POLAR_SERVER_VALUES)[number];

const DEFAULT_POLAR_SERVER: PolarServer = "sandbox";

const getRequiredEnv = (name: string): string => {
  const value = optionalEnv(name);
  if (!value) {
    throw new Error(`${name} is required for Polar billing integration`);
  }
  return value;
};

export const getPolarAccessToken = (): string => getRequiredEnv("POLAR_ACCESS_TOKEN");

export const getPolarWebhookSecret = (): string => getRequiredEnv("POLAR_WEBHOOK_SECRET");

/** Product behind the Growth tier (docs/PRODUCT_PLAN.md §3.5). */
export const getPolarGrowthProductId = (): string =>
  getRequiredEnv("POLAR_GROWTH_PRODUCT_ID");

export const getPolarServer = (): PolarServer => {
  const value = (optionalEnv("POLAR_SERVER") ?? DEFAULT_POLAR_SERVER).toLowerCase();

  if (POLAR_SERVER_VALUES.includes(value as PolarServer)) {
    return value as PolarServer;
  }

  throw new Error(
    `POLAR_SERVER must be one of: ${POLAR_SERVER_VALUES.join(", ")}. Received: ${value}`,
  );
};

/**
 * Builds a Polar client.
 *
 * Deliberately not memoised: a module-level client would be shared across
 * requests inside a Worker isolate, and construction is cheap.
 */
export const getPolarClient = (): Polar =>
  new Polar({
    accessToken: getPolarAccessToken(),
    server: getPolarServer(),
  });

export type CreateCheckoutParams = {
  userId: string;
  successUrl: string;
  returnUrl?: string;
};

export const createCheckoutForUser = async (
  params: CreateCheckoutParams,
): Promise<string> => {
  const checkout = await getPolarClient().checkouts.create({
    products: [getPolarGrowthProductId()],
    externalCustomerId: params.userId,
    successUrl: params.successUrl,
    returnUrl: params.returnUrl,
  });

  return checkout.url;
};

export type CreatePortalParams = {
  userId: string;
  returnUrl?: string;
};

export const createPortalForUser = async (
  params: CreatePortalParams,
): Promise<string> => {
  const session = await getPolarClient().customerSessions.create({
    externalCustomerId: params.userId,
    returnUrl: params.returnUrl,
  });

  return session.customerPortalUrl;
};

const isNotFound = (error: unknown): boolean => {
  if (error instanceof PolarError) {
    return error.statusCode === 404;
  }
  return false;
};

export const getCustomerStateExternal = async (
  externalId: string,
): Promise<CustomerState | null> => {
  try {
    return await getPolarClient().customers.getStateExternal({ externalId });
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }
    throw error;
  }
};

export type PolarWebhookEvent = ReturnType<typeof validateEvent>;

export const validatePolarWebhookEvent = (
  body: string | Buffer,
  headers: Record<string, string>,
): PolarWebhookEvent => {
  return validateEvent(body, headers, getPolarWebhookSecret());
};

export { WebhookVerificationError };

const coerceString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim() ? value : null;
};

/**
 * Resolve our user ID from supported Polar webhook payloads.
 * We store customerExternalId as Better Auth user.id in Polar.
 */
export const extractExternalCustomerIdFromWebhookEvent = (
  event: PolarWebhookEvent,
): string | null => {
  const data = (event as { data?: unknown }).data;
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;

  const directExternalId = coerceString(record.externalId);
  if (directExternalId) {
    return directExternalId;
  }

  const customer = record.customer;
  if (customer && typeof customer === "object") {
    const nestedExternalId = coerceString(
      (customer as Record<string, unknown>).externalId,
    );
    if (nestedExternalId) {
      return nestedExternalId;
    }
  }

  const customerExternalId = coerceString(record.customerExternalId);
  if (customerExternalId) {
    return customerExternalId;
  }

  return null;
};
