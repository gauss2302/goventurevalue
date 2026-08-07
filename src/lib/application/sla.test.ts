import { describe, expect, it } from "vitest";

import {
  computeMedianResponseHours,
  computeResponseRate,
  computeSlaDueAt,
  countsAsCompanyResponse,
  deriveSlaVerdict,
  isCandidateVisibleKind,
  resolveResponsibleMemberId,
  type ApplicationEventKind,
  type SlaEvent,
} from "@/lib/application/sla";

const APPLIED_AT = new Date("2026-08-01T00:00:00Z");
const SLA_DAYS = 7;
const DUE_AT = computeSlaDueAt(APPLIED_AT, SLA_DAYS);

const at = (isoDay: string) => new Date(`2026-08-${isoDay}T00:00:00Z`);

const event = (kind: ApplicationEventKind, day: string): SlaEvent => ({
  kind,
  occurredAt: at(day),
});

describe("what counts as a response", () => {
  it("counts only company-authored, candidate-visible events", () => {
    expect(countsAsCompanyResponse("message_to_candidate")).toBe(true);
    expect(countsAsCompanyResponse("decision")).toBe(true);
  });

  it("does not let an internal status change satisfy the promise", () => {
    // The loophole this whole module exists to close: the candidate sees nothing
    // when an application moves to in_review, so it cannot count as a reply.
    expect(countsAsCompanyResponse("status_changed")).toBe(false);
    expect(isCandidateVisibleKind("status_changed")).toBe(false);
  });

  it.each<ApplicationEventKind>(["submitted", "internal_note", "assigned"])(
    "does not count the internal event %s",
    (kind) => {
      expect(countsAsCompanyResponse(kind)).toBe(false);
    },
  );

  it("does not count the candidate talking as being answered", () => {
    // Visible to the candidate — they wrote it — but not an answer from anyone.
    expect(isCandidateVisibleKind("candidate_message")).toBe(true);
    expect(countsAsCompanyResponse("candidate_message")).toBe(false);
  });
});

describe("computeSlaDueAt", () => {
  it("adds the SLA window to the application time", () => {
    expect(computeSlaDueAt(APPLIED_AT, 7).toISOString()).toBe("2026-08-08T00:00:00.000Z");
  });

  it.each([0, -1, Number.NaN])("rejects a non-positive window: %s", (days) => {
    expect(() => computeSlaDueAt(APPLIED_AT, days)).toThrow();
  });
});

describe("deriveSlaVerdict", () => {
  it("is pending while the window is open and nothing has happened", () => {
    const verdict = deriveSlaVerdict({
      appliedAt: APPLIED_AT,
      slaDueAt: DUE_AT,
      events: [event("submitted", "01")],
      now: at("03"),
    });

    expect(verdict).toEqual({ firstResponseAt: null, state: "pending", responseHours: null });
  });

  it("stays pending when the company only shuffled statuses internally", () => {
    // The decisive test. A company that reviewed, noted and assigned has done
    // real work — and the candidate still knows nothing, so the clock runs.
    const verdict = deriveSlaVerdict({
      appliedAt: APPLIED_AT,
      slaDueAt: DUE_AT,
      events: [
        event("submitted", "01"),
        event("status_changed", "02"),
        event("internal_note", "02"),
        event("assigned", "03"),
      ],
      now: at("05"),
    });

    expect(verdict.state).toBe("pending");
    expect(verdict.firstResponseAt).toBeNull();
  });

  it("breaches when the window closed with only internal activity", () => {
    const verdict = deriveSlaVerdict({
      appliedAt: APPLIED_AT,
      slaDueAt: DUE_AT,
      events: [event("submitted", "01"), event("status_changed", "02")],
      now: at("10"),
    });

    expect(verdict.state).toBe("breached");
  });

  it("is answered when the company replied inside the window", () => {
    const verdict = deriveSlaVerdict({
      appliedAt: APPLIED_AT,
      slaDueAt: DUE_AT,
      events: [event("submitted", "01"), event("message_to_candidate", "04")],
      now: at("05"),
    });

    expect(verdict.state).toBe("answered");
    expect(verdict.firstResponseAt).toEqual(at("04"));
    expect(verdict.responseHours).toBe(72);
  });

  it("accepts a rejection as an answer", () => {
    // A clear no inside the window is exactly what the promise asks for.
    const verdict = deriveSlaVerdict({
      appliedAt: APPLIED_AT,
      slaDueAt: DUE_AT,
      events: [event("decision", "02")],
      now: at("03"),
    });

    expect(verdict.state).toBe("answered");
  });

  it("still counts a late reply as a breach", () => {
    // "answered" means answered on time; otherwise the published rate would
    // flatter companies that always reply eventually.
    const verdict = deriveSlaVerdict({
      appliedAt: APPLIED_AT,
      slaDueAt: DUE_AT,
      events: [event("message_to_candidate", "20")],
      now: at("21"),
    });

    expect(verdict.state).toBe("breached");
    expect(verdict.firstResponseAt).toEqual(at("20"));
    // Still recorded, so the median reflects reality.
    expect(verdict.responseHours).toBeGreaterThan(0);
  });

  it("takes the earliest response when several exist", () => {
    const verdict = deriveSlaVerdict({
      appliedAt: APPLIED_AT,
      slaDueAt: DUE_AT,
      events: [event("decision", "06"), event("message_to_candidate", "03")],
      now: at("07"),
    });

    expect(verdict.firstResponseAt).toEqual(at("03"));
  });

  it("cancels the obligation when the candidate withdraws first", () => {
    // A company must not be blamed for someone else changing their mind.
    const verdict = deriveSlaVerdict({
      appliedAt: APPLIED_AT,
      slaDueAt: DUE_AT,
      events: [event("submitted", "01"), event("candidate_withdrew", "02")],
      now: at("30"),
    });

    expect(verdict.state).toBe("cancelled");
  });

  it("keeps credit for a reply that preceded the withdrawal", () => {
    const verdict = deriveSlaVerdict({
      appliedAt: APPLIED_AT,
      slaDueAt: DUE_AT,
      events: [event("message_to_candidate", "02"), event("candidate_withdrew", "05")],
      now: at("30"),
    });

    expect(verdict.state).toBe("answered");
  });

  it("does not depend on the order events are supplied in", () => {
    const forwards = deriveSlaVerdict({
      appliedAt: APPLIED_AT,
      slaDueAt: DUE_AT,
      events: [event("submitted", "01"), event("message_to_candidate", "03")],
      now: at("04"),
    });
    const backwards = deriveSlaVerdict({
      appliedAt: APPLIED_AT,
      slaDueAt: DUE_AT,
      events: [event("message_to_candidate", "03"), event("submitted", "01")],
      now: at("04"),
    });

    expect(forwards).toEqual(backwards);
  });
});

describe("resolveResponsibleMemberId", () => {
  it("prefers the assignee, then the hiring manager, then the SLA contact", () => {
    expect(
      resolveResponsibleMemberId({
        assigneeMemberId: "m-assignee",
        hiringManagerMemberId: "m-manager",
        slaContactMemberId: "m-contact",
      }),
    ).toBe("m-assignee");

    expect(
      resolveResponsibleMemberId({
        hiringManagerMemberId: "m-manager",
        slaContactMemberId: "m-contact",
      }),
    ).toBe("m-manager");

    expect(resolveResponsibleMemberId({ slaContactMemberId: "m-contact" })).toBe("m-contact");
  });

  it("returns null when nobody is accountable", () => {
    // Surfaced rather than hidden: an unassigned application is one nobody
    // will answer, which is an operational fault.
    expect(resolveResponsibleMemberId({})).toBeNull();
  });
});

describe("computeResponseRate", () => {
  it("measures answered against everything resolved", () => {
    const result = computeResponseRate(["answered", "answered", "breached"]);

    expect(result.rate).toBeCloseTo(2 / 3, 5);
    expect(result.measured).toBe(3);
  });

  it("excludes cancelled and still-pending applications", () => {
    const result = computeResponseRate(["answered", "cancelled", "pending", "breached"]);

    expect(result.measured).toBe(2);
    expect(result.rate).toBeCloseTo(0.5, 5);
  });

  it("returns null rather than 0 when there is nothing to measure", () => {
    // Honesty contract §6.4 rule 2: a company with no resolved applications has
    // no response rate. "0%" would be a false accusation.
    expect(computeResponseRate([]).rate).toBeNull();
    expect(computeResponseRate(["pending", "cancelled"]).rate).toBeNull();
  });
});

describe("computeMedianResponseHours", () => {
  it("returns the median for an odd count", () => {
    expect(computeMedianResponseHours([10, 2, 6])).toBe(6);
  });

  it("averages the middle pair for an even count", () => {
    expect(computeMedianResponseHours([2, 4, 6, 8])).toBe(5);
  });

  it("is not skewed by a single extreme outlier", () => {
    // The reason this is a median: one three-month ghosting must not hide how a
    // company usually behaves, nor be hidden by how it usually behaves.
    expect(computeMedianResponseHours([1, 2, 3, 4, 2000])).toBe(3);
  });

  it("returns null when there is nothing to measure", () => {
    expect(computeMedianResponseHours([])).toBeNull();
  });
});
