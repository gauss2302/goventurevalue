import { describe, expect, it } from "vitest";

import { getRequestOrigin, sanitizeReturnPath } from "@/lib/billing/serverFns";

describe("sanitizeReturnPath", () => {
  it("keeps a safe in-app path", () => {
    expect(sanitizeReturnPath("/jobs/42")).toBe("/jobs/42");
  });

  // Fallback is "/" until the dashboards exist (Phase 4).
  it("falls back for unsafe paths", () => {
    expect(sanitizeReturnPath("https://evil.example")).toBe("/");
    expect(sanitizeReturnPath("//evil.example")).toBe("/");
    expect(sanitizeReturnPath("jobs/42")).toBe("/");
    expect(sanitizeReturnPath(null)).toBe("/");
  });
});

describe("getRequestOrigin", () => {
  it("uses forwarded headers when present", () => {
    const headers = new Headers({
      "x-forwarded-proto": "https",
      "x-forwarded-host": "app.example.com",
    });

    expect(getRequestOrigin(headers)).toBe("https://app.example.com");
  });

  it("falls back to host header", () => {
    const headers = new Headers({ host: "localhost:3000" });

    expect(getRequestOrigin(headers)).toBe("http://localhost:3000");
  });
});
