import { describe, expect, it } from "vitest";

import {
  BILLING_SNAPSHOT_STALE_MS,
  isBillingSnapshotStale,
  isExportEntitled,
  pickTrackedSubscription,
} from "@/lib/billing/subscription";

describe("isExportEntitled", () => {
  it("returns true for active status", () => {
    expect(isExportEntitled({ status: "active" })).toBe(true);
  });

  it("returns true for trialing status", () => {
    expect(isExportEntitled({ status: "trialing" })).toBe(true);
  });

  it("returns false for non-entitled status", () => {
    expect(isExportEntitled({ status: "inactive" })).toBe(false);
  });

  it("returns false when snapshot is missing", () => {
    expect(isExportEntitled(null)).toBe(false);
  });
});

describe("isBillingSnapshotStale", () => {
  it("returns false when snapshot is still fresh", () => {
    const now = new Date("2026-02-22T12:00:00.000Z");
    const updatedAt = new Date(now.getTime() - BILLING_SNAPSHOT_STALE_MS + 1);

    expect(isBillingSnapshotStale({ updatedAt }, now)).toBe(false);
  });

  it("returns true when snapshot is older than stale threshold", () => {
    const now = new Date("2026-02-22T12:00:00.000Z");
    const updatedAt = new Date(now.getTime() - BILLING_SNAPSHOT_STALE_MS - 1);

    expect(isBillingSnapshotStale({ updatedAt }, now)).toBe(true);
  });
});

describe("pickTrackedSubscription", () => {
  it("finds active subscription for configured product", () => {
    const state = {
      activeSubscriptions: [
        { id: "sub_other", productId: "prod_other" },
        { id: "sub_export", productId: "prod_export" },
      ],
    } as any;

    const selected = pickTrackedSubscription(state, "prod_export");

    expect(selected?.id).toBe("sub_export");
  });

  it("returns null when product is not present", () => {
    const state = {
      activeSubscriptions: [{ id: "sub_other", productId: "prod_other" }],
    } as any;

    expect(pickTrackedSubscription(state, "prod_export")).toBeNull();
  });
});
