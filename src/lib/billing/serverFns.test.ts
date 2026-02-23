import { describe, expect, it } from "vitest";

import { getRequestOrigin, sanitizeReturnPath } from "@/lib/billing/serverFns";

describe("sanitizeReturnPath", () => {
  it("keeps a safe in-app path", () => {
    expect(sanitizeReturnPath("/models/42")).toBe("/models/42");
  });

  it("falls back for unsafe paths", () => {
    expect(sanitizeReturnPath("https://evil.example")).toBe("/dashboard");
    expect(sanitizeReturnPath("//evil.example")).toBe("/dashboard");
    expect(sanitizeReturnPath("models/42")).toBe("/dashboard");
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
