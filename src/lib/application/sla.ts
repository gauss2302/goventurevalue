import type { applicationEventKindEnum, slaStateEnum } from "@/db/schema";

/**
 * The response promise, as executable rules (docs/PRODUCT_PLAN.md §3.2).
 *
 * The published response rate is the product. Everything here exists to keep
 * that number honest in both directions: a company must not be able to clear its
 * obligation without the candidate hearing anything, and must not be blamed for
 * something outside its control.
 *
 * Deliberately free of database and Worker imports so it stays unit-testable.
 */

export type ApplicationEventKind = (typeof applicationEventKindEnum.enumValues)[number];
export type SlaState = (typeof slaStateEnum.enumValues)[number];

/**
 * Events the candidate perceives — the timeline they are shown.
 *
 * Includes their own actions: they obviously see what they did themselves.
 */
const CANDIDATE_VISIBLE_KINDS = new Set<ApplicationEventKind>([
  "message_to_candidate",
  "decision",
  "candidate_message",
  "candidate_withdrew",
]);

/**
 * Events that satisfy the promise.
 *
 * The narrow set, and narrow on purpose. `status_changed` is excluded even
 * though a company might feel it counts as progress: the candidate sees nothing,
 * so counting it would let a company discharge the SLA by clicking a button and
 * the promise would mean nothing. `candidate_message` is excluded because it is
 * the candidate talking, not being answered.
 */
const COMPANY_RESPONSE_KINDS = new Set<ApplicationEventKind>([
  "message_to_candidate",
  "decision",
]);

export const isCandidateVisibleKind = (kind: ApplicationEventKind): boolean =>
  CANDIDATE_VISIBLE_KINDS.has(kind);

export const countsAsCompanyResponse = (kind: ApplicationEventKind): boolean =>
  COMPANY_RESPONSE_KINDS.has(kind);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const computeSlaDueAt = (appliedAt: Date, slaResponseDays: number): Date => {
  if (!Number.isFinite(slaResponseDays) || slaResponseDays <= 0) {
    throw new Error(`[sla] slaResponseDays must be positive, received ${slaResponseDays}`);
  }
  return new Date(appliedAt.getTime() + slaResponseDays * MS_PER_DAY);
};

export type SlaEvent = {
  kind: ApplicationEventKind;
  occurredAt: Date;
};

export type SlaVerdict = {
  /** When the candidate first heard back from the company, if ever. */
  firstResponseAt: Date | null;
  state: SlaState;
  /** Hours from application to first response — the input to the public median. */
  responseHours: number | null;
};

/**
 * Derives the SLA verdict for one application from its event history.
 *
 * Rules, in order:
 *   1. A withdrawal cancels the obligation. The company is not measured on it.
 *   2. The first company response sets `firstResponseAt`.
 *   3. A response after the deadline is still a breach — `answered` means
 *      answered *on time*, otherwise the published rate would flatter companies
 *      that reply eventually.
 *   4. No response and the deadline passed → breached.
 *   5. No response and time remains → pending.
 */
export const deriveSlaVerdict = (input: {
  appliedAt: Date;
  slaDueAt: Date;
  events: readonly SlaEvent[];
  now?: Date;
}): SlaVerdict => {
  const { appliedAt, slaDueAt, events, now = new Date() } = input;

  const ordered = [...events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  // Rule 1: withdrawal releases the company, regardless of what follows.
  const withdrawal = ordered.find((event) => event.kind === "candidate_withdrew");

  // Rule 2: the first genuine response.
  const response = ordered.find((event) => countsAsCompanyResponse(event.kind));

  if (withdrawal && (!response || withdrawal.occurredAt <= response.occurredAt)) {
    return { firstResponseAt: null, state: "cancelled", responseHours: null };
  }

  if (response) {
    const responseHours = (response.occurredAt.getTime() - appliedAt.getTime()) / (60 * 60 * 1000);
    return {
      firstResponseAt: response.occurredAt,
      // Rule 3: late is not answered.
      state: response.occurredAt <= slaDueAt ? "answered" : "breached",
      responseHours: Math.round(responseHours * 10) / 10,
    };
  }

  // Rules 4 and 5.
  return {
    firstResponseAt: null,
    state: now > slaDueAt ? "breached" : "pending",
    responseHours: null,
  };
};

/**
 * Who owes the reply.
 *
 * The application's assignee, else the role's hiring manager, else the company's
 * SLA contact. Returning null means nobody is accountable, which is an
 * operational fault worth surfacing rather than silently tolerating — an
 * unassigned application is one nobody will answer.
 */
export const resolveResponsibleMemberId = (input: {
  assigneeMemberId?: string | null;
  hiringManagerMemberId?: string | null;
  slaContactMemberId?: string | null;
}): string | null =>
  input.assigneeMemberId ?? input.hiringManagerMemberId ?? input.slaContactMemberId ?? null;

/**
 * Company response rate over a set of applications.
 *
 * `cancelled` applications are excluded from both numerator and denominator:
 * they are not evidence either way. Returns null rather than 0 when there is
 * nothing to measure — a company with no applications has no response rate, and
 * showing "0%" would be a false accusation (§6.4 rule 2).
 */
export const computeResponseRate = (
  states: readonly SlaState[],
): { rate: number | null; answered: number; measured: number } => {
  const measurable = states.filter((state) => state !== "cancelled" && state !== "pending");
  const answered = measurable.filter((state) => state === "answered").length;

  return {
    rate: measurable.length === 0 ? null : answered / measurable.length,
    answered,
    measured: measurable.length,
  };
};

/**
 * Median first-response time in hours.
 *
 * Median, not mean: one company that ghosted a single candidate for three months
 * should not have its typical behaviour hidden by averaging.
 */
export const computeMedianResponseHours = (
  responseHours: readonly number[],
): number | null => {
  if (responseHours.length === 0) {
    return null;
  }

  const sorted = [...responseHours].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  const median =
    sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];

  return Math.round(median * 10) / 10;
};
