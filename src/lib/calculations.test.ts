import { describe, expect, it } from "vitest";
import {
  calculateDCF,
  calculateProjections,
  calculateVCValuation,
  DEFAULT_MARKET_SIZING,
  DEFAULT_SETTINGS,
  type ProjectionData,
  type ScenarioParams,
} from "./calculations";

function minimalProjection(totalRevenue: number): ProjectionData[] {
  return [{ totalRevenue } as ProjectionData];
}

const baseScenarioParams: ScenarioParams = {
  userGrowth: 0.25,
  arpu: 49,
  churnRate: 0.05,
  cac: 150,
  expansionRate: 0.1,
  grossMarginTarget: 0.7,
  revenueGrowthRate: 0,
};

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

describe("calculateProjections", () => {
  it("includes expansion revenue from expansionRate", () => {
    const withExpansion = calculateProjections(
      baseScenarioParams,
      DEFAULT_SETTINGS,
      DEFAULT_MARKET_SIZING
    );
    const withoutExpansion = calculateProjections(
      { ...baseScenarioParams, expansionRate: 0 },
      DEFAULT_SETTINGS,
      DEFAULT_MARKET_SIZING
    );

    expect(withExpansion[0].expansionRevenue).toBeGreaterThan(0);
    expect(withExpansion[0].totalRevenue).toBeGreaterThan(
      withoutExpansion[0].totalRevenue
    );
  });

  it("produces negative Y5 EBITDA margin with default seed assumptions", () => {
    const projections = calculateProjections(
      baseScenarioParams,
      DEFAULT_SETTINGS,
      DEFAULT_MARKET_SIZING
    );
    const y5 = projections[projections.length - 1];

    expect(y5.ebitda).toBeLessThan(0);
    expect(y5.ebitdaMargin).toBeLessThan(0);
  });
});

describe("calculateDCF", () => {
  it("returns null enterprise value when terminal FCF is negative", () => {
    const projections = calculateProjections(
      baseScenarioParams,
      DEFAULT_SETTINGS,
      DEFAULT_MARKET_SIZING
    );
    const dcf = calculateDCF(
      projections,
      DEFAULT_SETTINGS.discountRate,
      DEFAULT_SETTINGS.terminalGrowth
    );

    expect(dcf.isApplicable).toBe(false);
    expect(dcf.enterpriseValue).toBeNull();
    expect(dcf.notApplicableReason).toBeTruthy();
  });

  it("returns positive enterprise value when terminal FCF is positive", () => {
    const projections: ProjectionData[] = [
      { freeCashFlow: 50_000 } as ProjectionData,
      { freeCashFlow: 80_000 } as ProjectionData,
      { freeCashFlow: 120_000 } as ProjectionData,
      { freeCashFlow: 160_000 } as ProjectionData,
      { freeCashFlow: 200_000 } as ProjectionData,
    ];

    const dcf = calculateDCF(projections, 0.15, 0.03);

    expect(dcf.isApplicable).toBe(true);
    expect(dcf.enterpriseValue).toBeGreaterThan(0);
  });
});
