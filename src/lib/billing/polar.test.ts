import { describe, expect, it } from "vitest";

import { extractExternalCustomerIdFromWebhookEvent } from "@/lib/billing/polar";

describe("extractExternalCustomerIdFromWebhookEvent", () => {
  it("extracts external ID from customer state webhook payload", () => {
    const event = {
      type: "customer.state_changed",
      timestamp: new Date(),
      data: {
        externalId: "user_123",
      },
    } as any;

    expect(extractExternalCustomerIdFromWebhookEvent(event)).toBe("user_123");
  });

  it("extracts external ID from nested subscription customer payload", () => {
    const event = {
      type: "subscription.updated",
      timestamp: new Date(),
      data: {
        customer: {
          externalId: "user_456",
        },
      },
    } as any;

    expect(extractExternalCustomerIdFromWebhookEvent(event)).toBe("user_456");
  });

  it("returns null when payload has no external customer mapping", () => {
    const event = {
      type: "checkout.created",
      timestamp: new Date(),
      data: {},
    } as any;

    expect(extractExternalCustomerIdFromWebhookEvent(event)).toBeNull();
  });
});
