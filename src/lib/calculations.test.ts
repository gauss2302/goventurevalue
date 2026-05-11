import { describe, expect, it } from "vitest";
import { calculateVCValuation, type ProjectionData } from "./calculations";

function minimalProjection(totalRevenue: number): ProjectionData[] {
  return [{ totalRevenue } as ProjectionData];
}

describe("calculateVCValuation", () => {
  it("divides exit value by target MOIC (total return multiple)", () => {
    const projections = minimalProjection(1_000_000);
    const r = calculateVCValuation(projections, {
      exitMultiple: 10,
      targetReturn: 10,
      roundSize: 0,
    });
    expect(r.expectedExitValue).toBe(10_000_000);
    expect(r.impliedPostMoney).toBe(1_000_000);
    expect(r.impliedPreMoney).toBe(1_000_000);
  });

  it("subtracts round size from implied post-money for pre-money", () => {
    const projections = minimalProjection(500_000);
    const r = calculateVCValuation(projections, {
      exitMultiple: 8,
      targetReturn: 4,
      roundSize: 500_000,
    });
    expect(r.expectedExitValue).toBe(4_000_000);
    expect(r.impliedPostMoney).toBe(1_000_000);
    expect(r.impliedPreMoney).toBe(500_000);
  });

  it("uses default MOIC when targetReturn is zero or negative", () => {
    const projections = minimalProjection(100_000);
    const r = calculateVCValuation(projections, {
      exitMultiple: 10,
      targetReturn: 0,
      roundSize: 0,
    });
    expect(r.impliedPostMoney).toBe(100_000);
  });
});
