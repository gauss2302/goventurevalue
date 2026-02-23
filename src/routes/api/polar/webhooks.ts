import { createFileRoute } from "@tanstack/react-router";

import { logger } from "@/lib/logger";

const toHeaderRecord = (headers: Headers): Record<string, string> => {
  return Object.fromEntries(headers.entries());
};

export const Route = createFileRoute("/api/polar/webhooks")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const [
          {
            validatePolarWebhookEvent,
            WebhookVerificationError,
            extractExternalCustomerIdFromWebhookEvent,
            getCustomerStateExternal,
          },
          { upsertBillingFromPolarState },
        ] = await Promise.all([
          import("@/lib/billing/polar"),
          import("@/lib/billing/subscription"),
        ]);

        const body = await request.text();

        try {
          const event = validatePolarWebhookEvent(
            body,
            toHeaderRecord(request.headers),
          );

          const externalCustomerId = extractExternalCustomerIdFromWebhookEvent(event);
          logger.info(
            "[Billing] Polar webhook received:",
            event.type,
            "externalCustomerId:",
            externalCustomerId ?? "unresolved",
          );

          if (!externalCustomerId) {
            return new Response(JSON.stringify({ ok: true, skipped: true }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          const state = await getCustomerStateExternal(externalCustomerId);
          await upsertBillingFromPolarState(externalCustomerId, state);

          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          if (error instanceof WebhookVerificationError) {
            logger.warn("[Billing] Polar webhook signature verification failed");
            return new Response(
              JSON.stringify({ error: "Invalid webhook signature" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          logger.error("[Billing] Polar webhook handling failed:", error);
          return new Response(
            JSON.stringify({ error: "Webhook processing failed" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});
