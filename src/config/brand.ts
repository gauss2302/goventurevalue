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

// ---------------------------------------------------------------------------
// What happens when a company misses the deadline (§6.7)
// ---------------------------------------------------------------------------

/**
 * Minimum resolved applications before we publish a rate or a median.
 *
 * The honesty contract already forbids showing 0% to a company we have never
 * measured (§6.4 rule 2). This is the same rule pointing the other way: "100%,
 * excellent" from a single reply is an equally confident claim about almost no
 * evidence. Below this, both figures read as "not enough measured yet".
 */
export const MIN_MEASURED_APPLICATIONS = 5;

/**
 * Length of the window a warning covers.
 *
 * A warning is issued per *window containing breaches*, never per breached
 * application. Per application, a busy company would burn the whole ladder in a
 * single afternoon — that measures volume, not behaviour. Per week, four
 * warnings mean at least four separate weeks of failing the same promise.
 */
export const SLA_WARNING_WINDOW_DAYS = 7;

/** Warnings before a company is suspended. */
export const SLA_MAX_WARNINGS = 4;

/**
 * The warning at which candidates are told.
 *
 * Two windows, not one: a single bad week is an incident, two is a pattern, and
 * a public mark for an incident would be unfair in the direction the honesty
 * contract cares least to be forgiving about.
 */
export const SLA_PUBLIC_MARK_AT_WARNING = 2;

/** The warning at which a company may no longer publish new roles. */
export const SLA_PUBLISH_BLOCK_AT_WARNING = 3;

/**
 * How long a warning counts against a company.
 *
 * Warnings expire so the ladder is not a one-way ratchet. Without decay a
 * company that fixed itself would still be one bad week from suspension for
 * ever, and the rational response to that is to leave rather than improve.
 */
export const SLA_WARNING_DECAY_DAYS = 90;

/** How far before the deadline the accountable member is reminded. */
export const SLA_REMINDER_LEAD_DAYS = 2;

/** How far before the deadline the SLA contact and owners are escalated to. */
export const SLA_ESCALATION_LEAD_HOURS = 12;
