import {
  MIN_MEASURED_APPLICATIONS,
  SLA_MAX_WARNINGS,
  SLA_PUBLIC_MARK_AT_WARNING,
  SLA_PUBLISH_BLOCK_AT_WARNING,
  SLA_WARNING_DECAY_DAYS,
  SLA_WARNING_WINDOW_DAYS,
} from "@/config/brand";

/**
 * What happens when a company misses the deadline it accepted
 * (docs/PRODUCT_PLAN.md §3.2, §6.7).
 *
 * Two mechanisms, deliberately independent, because they answer different
 * questions:
 *
 *   1. **The measured record** — the breach rate and median we publish. It moves
 *      the moment there is enough evidence to move it, with no sanction attached.
 *      A company that misses fifty deadlines in one week is described accurately
 *      on every one of its roles immediately, whatever the ladder says.
 *   2. **The warning ladder** — our relationship with the company. It escalates
 *      slowly and on purpose, so that a sanction is always something the company
 *      was warned about and had time to fix.
 *
 * Keeping them apart is what lets the ladder be forgiving without the numbers
 * ever being flattering. Candidates are protected by measurement; companies are
 * sanctioned by a process.
 *
 * Deliberately free of database and Worker imports so it stays unit-testable.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The window a breach falls into, as an ISO date.
 *
 * Anchored to Monday UTC, the same anchor as the candidate's weekly allowance,
 * so both windows roll over together and "this week" means one thing in the
 * product. The bucket is what makes issuing a warning idempotent: a unique index
 * on (company, window) means the sweep can run twice and warn once.
 */
export const warningWindowStart = (at: Date): string => {
  const day = new Date(
    Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()),
  );
  // getUTCDay: 0 = Sunday. Shift so Monday is the start.
  const offset = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - offset * MS_PER_DAY).toISOString().slice(0, 10);
};

export const nextWarningWindow = (at: Date): Date =>
  new Date(new Date(`${warningWindowStart(at)}T00:00:00Z`).getTime() + SLA_WARNING_WINDOW_DAYS * MS_PER_DAY);

export type IssuedWarning = {
  /** ISO date of the Monday the window began. */
  windowStart: string;
  issuedAt: Date;
};

/**
 * The warning level a company currently stands at.
 *
 * Counts only warnings inside the decay horizon. Level is derived from the
 * warning rows rather than incremented on a counter, for the same reason the SLA
 * state is derived from events: a counter that drifts from the rows it claims to
 * summarise is a number we would be publishing without being able to justify.
 */
export const currentWarningLevel = (
  warnings: readonly IssuedWarning[],
  now: Date = new Date(),
): number => {
  const horizon = now.getTime() - SLA_WARNING_DECAY_DAYS * MS_PER_DAY;
  return warnings.filter((warning) => warning.issuedAt.getTime() >= horizon).length;
};

export type Sanctions = {
  level: number;
  /** Candidates are told. */
  publicMark: boolean;
  /** No new roles may be published while failing to answer the current ones. */
  publishBlocked: boolean;
  /** Every role comes down and the company is suspended. */
  suspended: boolean;
  /** Warnings left before suspension. Zero once suspended. */
  warningsRemaining: number;
};

/**
 * Why this company may not publish another role, if it may not.
 *
 * Lives here rather than in the sweep so the publish gate can import it without
 * dragging in the database — and so the sanction is enforced where publishing
 * happens rather than only announced in a warning.
 */
export const publishBlockedReason = (row: { slaWarningLevel: number }): string | null => {
  const sanctions = sanctionsForLevel(row.slaWarningLevel);

  if (sanctions.suspended) {
    return "Your account is suspended for unanswered applicants. Talk to us to reopen it.";
  }
  if (sanctions.publishBlocked) {
    return (
      `You have ${row.slaWarningLevel} warnings for unanswered applicants. ` +
      "Answer the applicants you have before publishing another role."
    );
  }
  return null;
};

export const sanctionsForLevel = (level: number): Sanctions => ({
  level,
  publicMark: level >= SLA_PUBLIC_MARK_AT_WARNING,
  publishBlocked: level >= SLA_PUBLISH_BLOCK_AT_WARNING,
  suspended: level >= SLA_MAX_WARNINGS,
  warningsRemaining: Math.max(0, SLA_MAX_WARNINGS - level),
});

/**
 * Whether this window has earned a warning that has not been issued yet.
 *
 * A window earns one when it contains at least one breach. Late replies count:
 * the promise was a *timely* answer, and we already publish `answered` to mean
 * on time, so quietly forgiving late replies here would make the ladder and the
 * published number disagree about what the company promised.
 */
export const shouldIssueWarning = (input: {
  breachesInWindow: number;
  alreadyIssuedForWindow: boolean;
}): boolean => input.breachesInWindow > 0 && !input.alreadyIssuedForWindow;

/**
 * Whether enough wall-clock time has passed since the last warning.
 *
 * The rung spacing has to be measured in real time, not in sweeps. A company
 * that comes back from an outage owing three unwarned weeks would otherwise be
 * walked from untouched to suspended in three consecutive hourly runs — four
 * warnings it was never given the chance to act on. Spacing them a window apart
 * means every rung arrives with a week to fix the problem, which is the only
 * thing that makes the fourth one defensible.
 */
export const canIssueWarningNow = (input: {
  lastIssuedAt: Date | null;
  now: Date;
}): boolean =>
  input.lastIssuedAt === null ||
  input.now.getTime() - input.lastIssuedAt.getTime() >=
    SLA_WARNING_WINDOW_DAYS * MS_PER_DAY;

// ---------------------------------------------------------------------------
// The published record
// ---------------------------------------------------------------------------

export type MeasuredRecord = {
  /** Null until there is enough to measure — never 0, and never 100 from one. */
  responseRate: number | null;
  medianFirstResponseHours: number | null;
  /** Resolved applications behind the figures, so the reader can judge them. */
  measured: number;
  breached: number;
};

/**
 * The figures we are willing to publish about a company.
 *
 * `measured` counts applications that resolved one way or the other. Anything
 * still pending is not evidence yet, and a candidate who withdrew is not
 * evidence at all.
 */
export const publishableRecord = (input: {
  answered: number;
  breached: number;
  medianFirstResponseHours: number | null;
}): MeasuredRecord => {
  const measured = input.answered + input.breached;
  const enough = measured >= MIN_MEASURED_APPLICATIONS;

  return {
    responseRate: enough ? input.answered / measured : null,
    // The median is suppressed on the same threshold. One fast reply must not
    // become "typically under an hour" on every role this company posts.
    medianFirstResponseHours: enough ? input.medianFirstResponseHours : null,
    measured,
    breached: input.breached,
  };
};

/**
 * How the mark reads to a candidate.
 *
 * Returns null when there is nothing to say. When there is, it is a sentence
 * with the numbers in it rather than a badge: "flagged" tells a candidate
 * nothing they can weigh, and a label without evidence is exactly the confident
 * wrongness the honesty contract exists to prevent (§6.4).
 */
export const describeMark = (input: {
  level: number;
  breached: number;
  measured: number;
  companyName: string;
}): { headline: string; detail: string } | null => {
  if (input.level < SLA_PUBLIC_MARK_AT_WARNING) {
    return null;
  }

  const suspended = input.level >= SLA_MAX_WARNINGS;

  return {
    headline: suspended
      ? `${input.companyName} is suspended for not replying`
      : `${input.companyName} has missed reply deadlines`,
    detail:
      input.measured >= MIN_MEASURED_APPLICATIONS
        ? `${input.breached} of the last ${input.measured} applicants did not get an answer in time. ` +
          (suspended
            ? "Their roles are no longer listed."
            : `We have warned them ${input.level} times; after ${SLA_MAX_WARNINGS} their roles come down.`)
        : // The ladder can reach level 2 on few applications. Say what we know
          // rather than borrowing a rate we are not willing to publish.
          `They have missed the deadline in ${input.level} separate weeks. ` +
          "That is too few applications for us to publish a rate.",
  };
};
