import { describe, expect, it } from "vitest";

import {
  MIN_DESCRIPTION_LENGTH,
  missingRoleRequirements,
  roleReadiness,
  ROLE_REQUIREMENT_REASONS,
  type PublishableRole,
} from "@/lib/job/publishRequirements";

const description = "x".repeat(MIN_DESCRIPTION_LENGTH);

const ready: PublishableRole = {
  title: "Senior Backend Engineer",
  descriptionMd: description,
  roleFamily: "backend",
  seniority: "senior",
  remoteType: "remote",
};

describe("publish requirements", () => {
  it("accepts a role that can actually be matched and judged", () => {
    const readiness = roleReadiness(ready);

    expect(readiness.ready).toBe(true);
    expect(readiness.missing).toEqual([]);
    expect(readiness.completeness).toBe(1);
  });

  it("reports everything missing on an empty role", () => {
    const readiness = roleReadiness({});

    expect(readiness.ready).toBe(false);
    expect(readiness.completeness).toBe(0);
    expect(readiness.missing).toEqual([
      "title",
      "description",
      "roleFamily",
      "seniority",
      "remoteType",
    ]);
  });

  it.each(["roleFamily", "seniority"] as const)(
    "blocks publishing without %s, because matching filters on it",
    (field) => {
      // A role without these reaches nobody — publishing it would be a listing
      // that exists but cannot be found.
      expect(missingRoleRequirements({ ...ready, [field]: null })).toContain(field);
    },
  );

  it("rejects a description too short to judge", () => {
    expect(missingRoleRequirements({ ...ready, descriptionMd: "We are hiring!" })).toContain(
      "description",
    );
  });

  it("does not count whitespace as a description", () => {
    expect(
      missingRoleRequirements({ ...ready, descriptionMd: " ".repeat(500) }),
    ).toContain("description");
  });

  it("requires a location only when the role is not remote", () => {
    expect(missingRoleRequirements({ ...ready, remoteType: "remote" })).not.toContain("location");

    for (const remoteType of ["onsite", "hybrid"] as const) {
      expect(missingRoleRequirements({ ...ready, remoteType })).toContain("location");
      expect(
        missingRoleRequirements({ ...ready, remoteType, locations: ["Berlin"] }),
      ).not.toContain("location");
    }
  });

  it("treats a withheld salary as fine and an empty public band as not", () => {
    // Withholding is an honest choice rendered as "not disclosed" (§6.4 rule 2);
    // claiming to show a band while showing nothing is not.
    expect(missingRoleRequirements({ ...ready, salaryIsPublic: false })).not.toContain(
      "salaryBand",
    );

    expect(missingRoleRequirements({ ...ready, salaryIsPublic: true })).toContain("salaryBand");

    expect(
      missingRoleRequirements({ ...ready, salaryIsPublic: true, salaryMin: 140_000 }),
    ).not.toContain("salaryBand");
  });

  it("keeps completeness within bounds when conditional requirements are unmet", () => {
    // A hybrid role missing its location is still 100% on the baseline fields —
    // the bar must not read as more than complete, nor drop below zero.
    const readiness = roleReadiness({ ...ready, remoteType: "hybrid" });

    expect(readiness.ready).toBe(false);
    expect(readiness.completeness).toBe(1);
    expect(readiness.missing).toEqual(["location"]);
  });

  it("explains every requirement it reports", () => {
    const readiness = roleReadiness({});

    expect(readiness.reasons).toHaveLength(readiness.missing.length);
    for (const reason of Object.values(ROLE_REQUIREMENT_REASONS)) {
      expect(reason.trim().length).toBeGreaterThan(0);
    }
  });
});
