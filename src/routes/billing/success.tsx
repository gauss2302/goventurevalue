import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Post-checkout landing.
 *
 * Redirects to the home page until the company dashboard exists (Phase 3,
 * docs/PRODUCT_PLAN.md §7). The `billing=success` marker is preserved so the
 * dashboard can acknowledge the payment once it is built.
 */
export const Route = createFileRoute("/billing/success")({
  beforeLoad: () => {
    throw redirect({ to: "/", search: { billing: "success" } });
  },
  component: () => null,
});
