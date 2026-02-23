import type { CustomerState } from "@polar-sh/sdk/models/components/customerstate";
import type { CustomerStateSubscription } from "@polar-sh/sdk/models/components/customerstatesubscription";
import { eq } from "drizzle-orm";

import { db } from "@/db/index";
import { billingSubscriptions } from "@/db/schema";
import {
  getCustomerStateExternal,
  getPolarExportsProductId,
} from "@/lib/billing/polar";

export const BILLING_SNAPSHOT_STALE_MS = 5 * 60 * 1000;

export type BillingSnapshot = typeof billingSubscriptions.$inferSelect;

export type BillingSnapshotLike = {
  status: string;
};

export const isExportEntitled = (
  snapshot: BillingSnapshotLike | null | undefined,
): boolean => {
  if (!snapshot) return false;
  return snapshot.status === "active" || snapshot.status === "trialing";
};

export const isBillingSnapshotStale = (
  snapshot: Pick<BillingSnapshot, "updatedAt">,
  now: Date = new Date(),
): boolean => {
  return now.getTime() - snapshot.updatedAt.getTime() > BILLING_SNAPSHOT_STALE_MS;
};

export const pickTrackedSubscription = (
  state: CustomerState | null,
  productId: string,
): CustomerStateSubscription | null => {
  if (!state) return null;

  const matching = state.activeSubscriptions.find(
    (subscription) => subscription.productId === productId,
  );

  return matching ?? null;
};

export const getBillingSnapshot = async (
  userId: string,
): Promise<BillingSnapshot | null> => {
  const snapshot = await db.query.billingSubscriptions.findFirst({
    where: eq(billingSubscriptions.userId, userId),
  });
  return snapshot ?? null;
};

export const upsertBillingFromPolarState = async (
  userId: string,
  state: CustomerState | null,
): Promise<BillingSnapshot> => {
  const now = new Date();
  const trackedProductId = getPolarExportsProductId();
  const subscription = pickTrackedSubscription(state, trackedProductId);

  const values = {
    userId,
    polarCustomerId: state?.id ?? null,
    polarSubscriptionId: subscription?.id ?? null,
    productId: subscription?.productId ?? trackedProductId,
    status: subscription?.status ?? "inactive",
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    updatedAt: now,
  };

  const existing = await getBillingSnapshot(userId);

  if (existing) {
    await db
      .update(billingSubscriptions)
      .set(values)
      .where(eq(billingSubscriptions.id, existing.id));
  } else {
    await db.insert(billingSubscriptions).values(values);
  }

  const latest = await getBillingSnapshot(userId);
  if (!latest) {
    throw new Error("Failed to persist billing snapshot");
  }

  return latest;
};

export const ensureFreshBillingSnapshot = async (
  userId: string,
): Promise<BillingSnapshot> => {
  const snapshot = await getBillingSnapshot(userId);

  if (snapshot && !isBillingSnapshotStale(snapshot)) {
    return snapshot;
  }

  const state = await getCustomerStateExternal(userId);
  return upsertBillingFromPolarState(userId, state);
};
