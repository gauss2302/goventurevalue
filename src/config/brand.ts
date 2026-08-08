/**
 * Product naming, in one place.
 *
 * The final name is still an open question (docs/PRODUCT_PLAN.md §11.1). Keeping
 * every user-visible brand string here means renaming is a single edit rather
 * than a grep across the codebase, so the naming decision never blocks work.
 *
 * `wrangler.jsonc` `name` and `package.json` `name` are deliberately neutral
 * ("startup-jobs") and are infrastructure identifiers, not brand.
 */

export const BRAND = {
  /** Product name as shown to users. */
  name: "Runway",

  /** One-line positioning, used in meta description and the landing hero. */
  tagline: "Startup jobs where you actually get an answer",

  /**
   * The promise, stated as a fact users can hold us to. Every company on the
   * platform has accepted this SLA (docs/PRODUCT_PLAN.md §3.2).
   */
  promise: "Every company here has committed to reply within 7 days.",
} as const;

/**
 * The response SLA, in days.
 *
 * This is a product constant, not a configuration knob: it appears in company
 * onboarding terms, candidate-facing copy, and the SLA sweep that computes
 * `application.sla_due_at`. Changing it changes a commitment already made to
 * existing companies, so it needs a migration plan, not an env var.
 *
 * Starting value per §11.5 — to be calibrated on design partners.
 */
export const SLA_RESPONSE_DAYS = 7;

/**
 * Version of the SLA terms a company accepts at onboarding.
 *
 * Stored per company in `company.sla_terms_version`. Bump it whenever the terms
 * change in substance — the window, what counts as a reply, or the consequence
 * of breaching. Companies keep the version they agreed to; restating their
 * public promise as something they never accepted would be dishonest, and the
 * promise is the product (§3.2).
 */
export const SLA_TERMS_VERSION = "2026-08-v1";

/**
 * Weekly application cap per candidate.
 *
 * Load-bearing, not a paywall: it is what makes the SLA physically achievable
 * (§3.2). Identical for free and paid users — never sold (§3.5).
 *
 * Starting value per §11.5 — to be calibrated on design partners.
 */
export const WEEKLY_APPLICATION_LIMIT = 8;
