import type { CustomerState } from "@polar-sh/sdk/models/components/customerstate";
import type { CustomerStateSubscription } from "@polar-sh/sdk/models/components/customerstatesubscription";
import { and, eq } from "drizzle-orm";

import type { Database } from "@/db/index";
import { billingSubscriptions } from "@/db/schema";
import { getCustomerStateExternal, getPolarGrowthProductId } from "@/lib/billing/polar";

export const BILLING_SNAPSHOT_STALE_MS = 5 * 60 * 1000;

export type BillingSnapshot = typeof billingSubscriptions.$inferSelect;

export type BillingSnapshotLike = {
  status: string;
};

/**
 * Whether a snapshot grants paid-tier access.
 *
 * Product-neutral by design: what a paid tier unlocks is defined in
 * docs/PRODUCT_PLAN.md §3.5, and never includes the application cap or the SLA.
 */
export const isSubscriptionActive = (
  snapshot: BillingSnapshotLike | null | undefined,
): boolean => {
  if (!snapshot) return false;
  return snapshot.status === "active" || snapshot.status === "trialing";
};

export const isBillingSnapshotStale = (
  snapshot: Pick<BillingSnapshot, "updatedAt">,
  now: Date = new Date(),
): boolean => now.getTime() - snapshot.updatedAt.getTime() > BILLING_SNAPSHOT_STALE_MS;

export const pickTrackedSubscription = (
  state: CustomerState | null,
  productId: string,
): CustomerStateSubscription | null => {
  if (!state) return null;

  return (
    state.activeSubscriptions.find((subscription) => subscription.productId === productId) ?? null
  );
};

export const getBillingSnapshot = async (
  db: Database,
  userId: string,
): Promise<BillingSnapshot | null> => {
  const snapshot = await db.query.billingSubscriptions.findFirst({
    where: and(
      eq(billingSubscriptions.userId, userId),
      eq(billingSubscriptions.provider, "polar"),
    ),
  });
  return snapshot ?? null;
};

export const upsertBillingFromPolarState = async (
  db: Database,
  userId: string,
  state: CustomerState | null,
): Promise<BillingSnapshot> => {
  const trackedProductId = getPolarGrowthProductId();
  const subscription = pickTrackedSubscription(state, trackedProductId);

  const values = {
    userId,
    provider: "polar" as const,
    externalId: subscription?.id ?? state?.id ?? null,
    productId: subscription?.productId ?? trackedProductId,
    status: subscription?.status ?? "inactive",
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    updatedAt: new Date(),
  };

  const existing = await getBillingSnapshot(db, userId);

  if (existing) {
    await db
      .update(billingSubscriptions)
      .set(values)
      .where(eq(billingSubscriptions.id, existing.id));
  } else {
    await db.insert(billingSubscriptions).values({
      id: crypto.randomUUID(),
      ...values,
    });
  }

  const latest = await getBillingSnapshot(db, userId);
  if (!latest) {
    throw new Error("Failed to persist billing snapshot");
  }

  return latest;
};

export const ensureFreshBillingSnapshot = async (
  db: Database,
  userId: string,
): Promise<BillingSnapshot> => {
  const snapshot = await getBillingSnapshot(db, userId);

  if (snapshot && !isBillingSnapshotStale(snapshot)) {
    return snapshot;
  }

  const state = await getCustomerStateExternal(userId);
  return upsertBillingFromPolarState(db, userId, state);
};
