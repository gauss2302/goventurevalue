import { describe, expect, it } from "vitest";

import {
  buildFlow,
  summariseFlow,
  type FlowInput,
  type FlowSourceEvent,
} from "@/lib/candidate/flow";

/**
 * The candidate's flow.
 *
 * The tests that matter most are the ones about what does *not* reach the
 * candidate: internal triage, and a stage nobody told them about. Those are the
 * two ways this screen could quietly break a promise — to companies, whose
 * private notes we said were private, and to candidates, who would read an
 * inferred stage as something they had been told.
 */

const APPLIED = new Date("2026-08-01T09:00:00Z");
const DUE = new Date("2026-08-08T09:00:00Z");

const flowInput = (overrides: Partial<FlowInput> = {}): FlowInput => ({
  companyName: "Acme",
  appliedAt: APPLIED,
  slaDueAt: DUE,
  slaState: "pending",
  candidateLastSeenAt: null,
  events: [],
  now: new Date("2026-08-03T09:00:00Z"),
  ...overrides,
});

const event = (overrides: Partial<FlowSourceEvent> & { kind: FlowSourceEvent["kind"] }): FlowSourceEvent => ({
  id: overrides.id ?? `e-${overrides.kind}`,
  body: null,
  fromStatus: null,
  toStatus: null,
  occurredAt: new Date("2026-08-02T09:00:00Z"),
  ...overrides,
});

describe("buildFlow", () => {
  it("tells the story of an application nobody has touched yet", () => {
    const flow = buildFlow(flowInput());

    expect(flow.stage).toBe("received");
    expect(flow.reply.state).toBe("pending");
    expect(flow.outcome.kind).toBe("open");
    expect(flow.canWithdraw).toBe(true);
    // Nothing to answer yet, so there is nothing to write back to.
    expect(flow.canMessage).toBe(false);
    expect(flow.entries.map((entry) => entry.kind)).toEqual(["applied", "commitment"]);
    expect(flow.reply.summary).toContain("until 8 Aug");
  });

  it("never puts words in anyone's mouth", () => {
    const flow = buildFlow(flowInput());

    // Everything we state ourselves is attributed to us and carries no body:
    // a quote has to come from someone (§6.4).
    for (const entry of flow.entries) {
      if (entry.actor === "platform") {
        expect(entry.body).toBeNull();
      }
    }
  });

  describe("what the candidate is not shown", () => {
    it("drops internal events even when they are handed to it", () => {
      const flow = buildFlow(
        flowInput({
          events: [
            event({ kind: "submitted" }),
            event({ kind: "internal_note", body: "Weak on distributed systems" }),
            event({ kind: "assigned", body: "member-7" }),
          ],
        }),
      );

      expect(flow.entries.map((entry) => entry.kind)).toEqual(["applied", "commitment"]);
      const bodies = flow.entries.map((entry) => entry.body).join(" ");
      expect(bodies).not.toContain("distributed systems");
    });

    it("does not move the stage on an internal status change", () => {
      const flow = buildFlow(
        flowInput({
          events: [
            event({ kind: "status_changed", fromStatus: "submitted", toStatus: "interviewing" }),
          ],
        }),
      );

      // The company moved it internally. The candidate was told nothing, so the
      // rail must not claim otherwise.
      expect(flow.stage).toBe("received");
      expect(flow.rail.find((step) => step.key === "interviewing")?.state).toBe("ahead");
      expect(flow.entries).toHaveLength(2);
    });
  });

  describe("a stage shared with a reply", () => {
    const shared = flowInput({
      events: [
        event({
          id: "reply-1",
          kind: "message_to_candidate",
          body: "We would like to talk next week.",
          fromStatus: "submitted",
          toStatus: "interviewing",
          occurredAt: new Date("2026-08-02T12:00:00Z"),
        }),
      ],
    });

    it("moves the rail and keeps the message and the move together", () => {
      const flow = buildFlow(shared);
      const entry = flow.entries.find((item) => item.id === "reply-1")!;

      expect(flow.stage).toBe("interviewing");
      expect(entry.stage).toEqual({ from: "received", to: "interviewing" });
      expect(entry.body).toBe("We would like to talk next week.");
      expect(entry.satisfiedPromise).toBe(true);
    });

    it("dates the steps it was told about and leaves the implied ones blank", () => {
      const flow = buildFlow(shared);
      const byKey = Object.fromEntries(flow.rail.map((step) => [step.key, step]));

      expect(byKey.received.at).toEqual(APPLIED);
      // Review must have happened for interviewing to be reached, but nobody
      // said when, so there is no date to show.
      expect(byKey.in_review.state).toBe("reached");
      expect(byKey.in_review.at).toBeNull();
      expect(byKey.interviewing.state).toBe("current");
      expect(byKey.interviewing.at).toEqual(new Date("2026-08-02T12:00:00Z"));
      expect(byKey.offer.state).toBe("ahead");
    });

    it("opens the thread to the candidate", () => {
      expect(buildFlow(shared).canMessage).toBe(true);
    });
  });

  it("credits only the first reply with satisfying the promise", () => {
    const flow = buildFlow(
      flowInput({
        events: [
          event({
            id: "first",
            kind: "message_to_candidate",
            body: "Looking now.",
            occurredAt: new Date("2026-08-02T09:00:00Z"),
          }),
          event({
            id: "second",
            kind: "decision",
            body: "Not this time.",
            toStatus: "rejected",
            occurredAt: new Date("2026-08-04T09:00:00Z"),
          }),
        ],
        now: new Date("2026-08-05T09:00:00Z"),
      }),
    );

    expect(flow.entries.filter((entry) => entry.satisfiedPromise).map((e) => e.id)).toEqual([
      "first",
    ]);
    expect(flow.reply.state).toBe("answered");
    expect(flow.outcome).toEqual({ kind: "closed", at: new Date("2026-08-04T09:00:00Z") });
    expect(flow.canWithdraw).toBe(false);
    expect(flow.next).toContain("closed this application");
  });

  describe("the deadline", () => {
    it("is reported the moment it passes, not when the sweep catches up", () => {
      const flow = buildFlow(
        flowInput({
          // What the hourly sweep still believes (§5.4).
          slaState: "pending",
          now: new Date("2026-08-08T10:00:00Z"),
        }),
      );

      expect(flow.reply.state).toBe("breached");
      expect(flow.entries.map((entry) => entry.kind)).toContain("deadline_missed");
      expect(flow.next).toContain("do not need to chase");
    });

    it("stays in the story when a late reply finally arrives", () => {
      const flow = buildFlow(
        flowInput({
          events: [
            event({
              id: "late",
              kind: "message_to_candidate",
              body: "Sorry for the delay.",
              occurredAt: new Date("2026-08-11T09:00:00Z"),
            }),
          ],
          now: new Date("2026-08-12T09:00:00Z"),
        }),
      );

      const kinds = flow.entries.map((entry) => entry.kind);

      // A late reply is still a missed deadline, and the order says so.
      expect(flow.reply.state).toBe("breached");
      expect(kinds.indexOf("deadline_missed")).toBeLessThan(kinds.indexOf("message"));
      expect(flow.reply.summary).toContain("after the 8 Aug deadline");
    });
  });

  it("releases the company when the candidate withdraws", () => {
    const withdrawnAt = new Date("2026-08-03T08:00:00Z");
    const flow = buildFlow(
      flowInput({
        events: [event({ kind: "candidate_withdrew", occurredAt: withdrawnAt })],
      }),
    );

    expect(flow.reply.state).toBe("cancelled");
    expect(flow.outcome).toEqual({ kind: "withdrawn", at: withdrawnAt });
    expect(flow.stage).toBe("withdrawn");
    expect(flow.canWithdraw).toBe(false);
    expect(flow.canMessage).toBe(false);
    expect(flow.reply.summary).toContain("not counted for or against");
  });

  describe("what is new", () => {
    const replyAt = new Date("2026-08-02T12:00:00Z");
    const withReply = {
      events: [
        event({ id: "r", kind: "message_to_candidate", body: "Hello", occurredAt: replyAt }),
      ],
    };

    it("counts a company reply the candidate has never opened", () => {
      const flow = buildFlow(flowInput({ ...withReply, candidateLastSeenAt: null }));

      expect(flow.unreadCount).toBe(1);
      // Their own application is not news to them.
      expect(flow.entries.find((entry) => entry.kind === "applied")?.unread).toBe(false);
    });

    it("clears once they have seen it", () => {
      const flow = buildFlow(
        flowInput({ ...withReply, candidateLastSeenAt: new Date("2026-08-02T13:00:00Z") }),
      );

      expect(flow.unreadCount).toBe(0);
    });

    it("never marks the candidate's own words unread", () => {
      const flow = buildFlow(
        flowInput({
          events: [
            ...withReply.events,
            event({
              id: "mine",
              kind: "candidate_message",
              body: "Thanks!",
              occurredAt: new Date("2026-08-02T14:00:00Z"),
            }),
          ],
          candidateLastSeenAt: new Date("2026-08-02T13:00:00Z"),
        }),
      );

      expect(flow.entries.find((entry) => entry.id === "mine")?.unread).toBe(false);
      expect(flow.unreadCount).toBe(0);
    });
  });
});

describe("summariseFlow", () => {
  it("reports the latest thing that actually happened", () => {
    const summary = summariseFlow(
      flowInput({
        events: [
          event({
            id: "r",
            kind: "message_to_candidate",
            body: "We would like to talk.",
            toStatus: "interviewing",
            occurredAt: new Date("2026-08-02T12:00:00Z"),
          }),
        ],
      }),
    );

    expect(summary.stage).toBe("interviewing");
    expect(summary.stageLabel).toBe("Interviewing");
    expect(summary.replyState).toBe("answered");
    expect(summary.unreadCount).toBe(1);
    expect(summary.lastUpdate?.actor).toBe("company");
    expect(summary.lastUpdate?.at).toEqual(new Date("2026-08-02T12:00:00Z"));
  });

  it("does not present our own commitment as an update from the company", () => {
    const summary = summariseFlow(flowInput());

    // The only entries are "you applied" and the commitment; neither is news.
    expect(summary.lastUpdate?.actor).toBe("candidate");
    expect(summary.unreadCount).toBe(0);
  });
});
