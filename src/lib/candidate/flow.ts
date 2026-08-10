import type { applicationStatusEnum } from "@/db/schema";
import {
  countsAsCompanyResponse,
  deriveSlaVerdict,
  isCandidateVisibleKind,
  type ApplicationEventKind,
  type SlaState,
} from "@/lib/application/sla";

/**
 * The candidate's view of one application, derived (docs/PRODUCT_PLAN.md §3.2).
 *
 * A candidate who applies and then sees a single "Answered" badge has been told
 * almost nothing. This module turns the record into the whole story: what they
 * did, what the company committed to, what the company has actually told them,
 * where the application stands, and what — if anything — happens next.
 *
 * Two rules shape all of it.
 *
 * First, a stage only appears here if the company deliberately told the
 * candidate. Internal triage (`status_changed`) is invisible, because we called
 * that field internal when companies agreed to use it; surfacing it now would
 * break our promise to them and would teach them to stop recording stages at
 * all. A stage the candidate is told about arrives as `from_status`/`to_status`
 * carried on a message — see src/lib/application/service.ts.
 *
 * Second, nothing here is invented. Titles are labels for recorded facts, bodies
 * are only ever the words someone actually wrote, and anything we assert
 * ourselves is attributed to `platform` so the candidate can tell our statement
 * from the company's (§6.4).
 *
 * Deliberately free of database and Worker imports so it stays unit-testable.
 */

export type ApplicationStatus = (typeof applicationStatusEnum.enumValues)[number];

// ---------------------------------------------------------------------------
// Stages
// ---------------------------------------------------------------------------

export type FlowStage =
  | "received"
  | "in_review"
  | "interviewing"
  | "offer"
  | "hired"
  | "closed"
  | "withdrawn";

/**
 * The stages that form a progression, in order.
 *
 * `closed` and `withdrawn` are deliberately absent: they are endings, not
 * positions along the way, and drawing them as the last step of a rail would
 * suggest a rejection is what everyone is progressing towards.
 */
export const STAGE_RAIL: readonly FlowStage[] = [
  "received",
  "in_review",
  "interviewing",
  "offer",
  "hired",
];

export const STAGE_LABEL: Record<FlowStage, string> = {
  received: "Received",
  in_review: "Under review",
  interviewing: "Interviewing",
  offer: "Offer",
  hired: "Hired",
  closed: "Not moving forward",
  withdrawn: "Withdrawn",
};

const STAGE_OF_STATUS: Record<ApplicationStatus, FlowStage> = {
  submitted: "received",
  in_review: "in_review",
  interviewing: "interviewing",
  offer: "offer",
  hired: "hired",
  rejected: "closed",
  withdrawn: "withdrawn",
};

export const stageOfStatus = (status: ApplicationStatus): FlowStage =>
  STAGE_OF_STATUS[status];

const railIndex = (stage: FlowStage): number => STAGE_RAIL.indexOf(stage);

export type RailStep = {
  key: FlowStage;
  label: string;
  state: "reached" | "current" | "ahead";
  /**
   * When the candidate was told they reached this stage.
   *
   * Null on a step that the current stage implies but that was never announced
   * on its own — reaching "interviewing" does mean review happened, but we do
   * not know when, so we do not put a date on it.
   */
  at: Date | null;
};

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export type FlowEntryKind =
  | "applied"
  | "commitment"
  | "message"
  | "decision"
  | "candidate_reply"
  | "withdrawn"
  | "deadline_missed";

export type FlowEntry = {
  id: string;
  kind: FlowEntryKind;
  at: Date;
  /**
   * Who this entry is attributed to.
   *
   * `platform` means we are stating it, not quoting anyone — the commitment and
   * a missed deadline are our measurements, and the candidate should be able to
   * tell them apart from something a company said.
   */
  actor: "company" | "candidate" | "platform";
  title: string;
  /** Someone's own words, verbatim. Never generated. */
  body: string | null;
  /** Set only when a stage was shared as part of this entry. */
  stage: { from: FlowStage | null; to: FlowStage } | null;
  /** True for the one entry that satisfied the reply promise, if any. */
  satisfiedPromise: boolean;
  /** New since the candidate last opened this application. */
  unread: boolean;
};

export type FlowOutcome =
  | { kind: "open" }
  | { kind: "hired"; at: Date }
  | { kind: "closed"; at: Date }
  | { kind: "withdrawn"; at: Date };

export type FlowSourceEvent = {
  id: string;
  kind: ApplicationEventKind;
  body: string | null;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus | null;
  occurredAt: Date;
};

export type FlowInput = {
  companyName: string;
  appliedAt: Date;
  slaDueAt: Date;
  /** Stored state; re-derived here, see the note in `buildFlow`. */
  slaState: SlaState;
  candidateLastSeenAt: Date | null;
  events: readonly FlowSourceEvent[];
  now?: Date;
};

export type Flow = {
  stage: FlowStage;
  rail: RailStep[];
  entries: FlowEntry[];
  outcome: FlowOutcome;
  reply: {
    state: SlaState;
    dueAt: Date;
    respondedAt: Date | null;
    /** Where the promise stands, in one sentence. */
    summary: string;
  };
  /** What happens next, as far as we actually know. */
  next: string;
  canMessage: boolean;
  canWithdraw: boolean;
  unreadCount: number;
};

const ENTRY_RANK: Record<FlowEntryKind, number> = {
  applied: 0,
  commitment: 1,
  deadline_missed: 2,
  message: 2,
  decision: 2,
  candidate_reply: 2,
  withdrawn: 2,
};

const formatDate = (value: Date): string =>
  value.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/**
 * Builds the candidate's flow.
 *
 * The stored `sla_state` is re-derived from the events rather than trusted,
 * because it is written by an hourly sweep (§5.4). A candidate looking at an
 * application two minutes after the deadline passed should see that it passed,
 * not a stale "awaiting reply" that only corrects itself on the hour.
 *
 * Internal events are filtered out here as well as in the query that loads them.
 * The duplication is on purpose: this is the boundary where a company's private
 * notes would become a candidate's reading material, so it should not depend on
 * every caller having remembered to filter.
 */
export const buildFlow = (input: FlowInput): Flow => {
  const { companyName, appliedAt, slaDueAt, candidateLastSeenAt, now = new Date() } = input;

  const visible = input.events
    .filter((event) => isCandidateVisibleKind(event.kind))
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  const verdict = deriveSlaVerdict({ appliedAt, slaDueAt, events: visible, now });

  // Anything after this point is new to the candidate. Falling back to
  // `appliedAt` rather than to the epoch means a candidate who has never opened
  // the flow is not told their own application is unread.
  const seenBefore = candidateLastSeenAt ?? appliedAt;

  // --- stages the candidate was actually told about -------------------------

  const told: Array<{ stage: FlowStage; at: Date }> = [
    // They applied, so they know it was received.
    { stage: "received", at: appliedAt },
  ];

  for (const event of visible) {
    if (event.kind === "candidate_withdrew") {
      told.push({ stage: "withdrawn", at: event.occurredAt });
      continue;
    }
    if (event.toStatus) {
      told.push({ stage: stageOfStatus(event.toStatus), at: event.occurredAt });
    }
  }

  const last = told[told.length - 1];
  const stage = last.stage;

  const outcome: FlowOutcome =
    stage === "withdrawn"
      ? { kind: "withdrawn", at: last.at }
      : stage === "closed"
        ? { kind: "closed", at: last.at }
        : stage === "hired"
          ? { kind: "hired", at: last.at }
          : { kind: "open" };

  // The furthest rail position we were told about. An ending sits off the rail,
  // so the rail keeps showing how far the application got before it ended.
  const onRail = told.filter((entry) => railIndex(entry.stage) >= 0);
  const currentIndex = onRail.reduce(
    (furthest, entry) => Math.max(furthest, railIndex(entry.stage)),
    0,
  );

  const rail: RailStep[] = STAGE_RAIL.map((key, index) => {
    const announced = [...onRail].reverse().find((entry) => entry.stage === key);

    return {
      key,
      label: STAGE_LABEL[key],
      state: index < currentIndex ? "reached" : index === currentIndex ? "current" : "ahead",
      at: announced?.at ?? null,
    };
  });

  // --- timeline ------------------------------------------------------------

  const entries: FlowEntry[] = [
    {
      id: "applied",
      kind: "applied",
      at: appliedAt,
      actor: "candidate",
      title: "You applied",
      body: null,
      stage: null,
      satisfiedPromise: false,
      unread: false,
    },
    {
      id: "commitment",
      kind: "commitment",
      at: appliedAt,
      actor: "platform",
      title: `${companyName} committed to replying by ${formatDate(slaDueAt)}`,
      body: null,
      stage: null,
      satisfiedPromise: false,
      unread: false,
    },
  ];

  let promiseSatisfiedBy: string | null = null;

  for (const event of visible) {
    const isFirstResponse =
      promiseSatisfiedBy === null && countsAsCompanyResponse(event.kind);

    if (isFirstResponse) {
      promiseSatisfiedBy = event.id;
    }

    const actor: FlowEntry["actor"] =
      event.kind === "candidate_message" || event.kind === "candidate_withdrew"
        ? "candidate"
        : "company";

    const kind: FlowEntryKind =
      event.kind === "decision"
        ? "decision"
        : event.kind === "candidate_message"
          ? "candidate_reply"
          : event.kind === "candidate_withdrew"
            ? "withdrawn"
            : "message";

    const to = event.toStatus ? stageOfStatus(event.toStatus) : null;

    entries.push({
      id: event.id,
      kind,
      at: event.occurredAt,
      actor,
      title:
        kind === "decision"
          ? `${companyName} sent a decision`
          : kind === "candidate_reply"
            ? "You replied"
            : kind === "withdrawn"
              ? "You withdrew this application"
              : `${companyName} replied`,
      body: event.body,
      stage: to ? { from: event.fromStatus ? stageOfStatus(event.fromStatus) : null, to } : null,
      satisfiedPromise: isFirstResponse,
      unread: actor !== "candidate" && event.occurredAt.getTime() > seenBefore.getTime(),
    });
  }

  // Our own measurement, stated at the moment it became true rather than when
  // the sweep noticed. Shown even when a reply arrived afterwards: a late reply
  // is still a missed deadline, and the timeline should read that way.
  if (verdict.state === "breached") {
    entries.push({
      id: "deadline_missed",
      kind: "deadline_missed",
      at: slaDueAt,
      actor: "platform",
      title: "The reply deadline passed",
      body: null,
      stage: null,
      satisfiedPromise: false,
      unread: slaDueAt.getTime() > seenBefore.getTime(),
    });
  }

  entries.sort((a, b) => {
    const byTime = a.at.getTime() - b.at.getTime();
    return byTime !== 0 ? byTime : ENTRY_RANK[a.kind] - ENTRY_RANK[b.kind];
  });

  // --- where the promise stands --------------------------------------------

  const summary =
    verdict.state === "cancelled"
      ? "You withdrew, so this is not counted for or against them."
      : verdict.state === "answered"
        ? `${companyName} replied within the ${formatDate(slaDueAt)} deadline.`
        : verdict.state === "breached"
          ? verdict.firstResponseAt
            ? `${companyName} replied, but after the ${formatDate(slaDueAt)} deadline. It counts as missed on their public record.`
            : `${companyName} has not replied and the ${formatDate(slaDueAt)} deadline has passed. It counts against their public record.`
          : `${companyName} has until ${formatDate(slaDueAt)} to reply.`;

  const hasCompanyMessage = visible.some((event) => countsAsCompanyResponse(event.kind));

  const next =
    outcome.kind === "withdrawn"
      ? "Nothing further — you withdrew. You can apply to other roles at the same company."
      : outcome.kind === "closed"
        ? "They have closed this application. Nothing more is expected from either side."
        : outcome.kind === "hired"
          ? "They marked this as hired. Anything further happens directly with them."
          : verdict.state === "pending"
            ? "Nothing is needed from you. We will show any update here as soon as it arrives."
            : verdict.state === "breached" && !verdict.firstResponseAt
              ? "You do not need to chase them. The miss is recorded, and we count it in the response rate shown on their roles."
              : "They have replied, so the promise is settled. Anything further is up to them, and you can write back here.";

  return {
    stage,
    rail,
    entries,
    outcome,
    reply: {
      state: verdict.state,
      dueAt: slaDueAt,
      respondedAt: verdict.firstResponseAt,
      summary,
    },
    next,
    // Not a general inbox: the candidate can write back once the company has
    // opened the conversation. Otherwise the thread becomes a way around the
    // weekly cap, and there is nobody on the other side who has read anything
    // yet (§3.2).
    canMessage: hasCompanyMessage && outcome.kind !== "withdrawn",
    canWithdraw: outcome.kind === "open",
    unreadCount: entries.filter((entry) => entry.unread).length,
  };
};

/**
 * The one-line state of an application for the tracker list.
 *
 * Same derivation as the full flow so the list and the detail screen can never
 * disagree about whether something is unread or overdue.
 */
export const summariseFlow = (
  input: FlowInput,
): {
  stage: FlowStage;
  stageLabel: string;
  replyState: SlaState;
  unreadCount: number;
  /** The most recent thing anyone said or we recorded. */
  lastUpdate: { at: Date; title: string; actor: FlowEntry["actor"] } | null;
} => {
  const flow = buildFlow(input);
  const meaningful = flow.entries.filter((entry) => entry.kind !== "commitment");
  const latest = meaningful[meaningful.length - 1] ?? null;

  return {
    stage: flow.stage,
    stageLabel: STAGE_LABEL[flow.stage],
    replyState: flow.reply.state,
    unreadCount: flow.unreadCount,
    lastUpdate: latest ? { at: latest.at, title: latest.title, actor: latest.actor } : null,
  };
};
