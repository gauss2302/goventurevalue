"use client";

import { useState, useCallback } from "react";
import { Info } from "lucide-react";
import { calculateDCF, calculateVCValuation, calculateCapTable } from "@/lib/calculations";
import type { ProjectionData, ModelSettings } from "@/lib/calculations";
import { calculateMultiplesValuation } from "@/lib/traction-calculations";
import type { StartupStage } from "@/lib/traction-calculations";
import { TOOLTIPS } from "@/lib/tooltips";

export type FundraisingData = {
  targetRaise: number | null;
  preMoneyValuation: number | null;
  useOfFunds: Record<string, number> | null;
  runwayTarget: number | null;
  plannedClose: string | null;
};

type FundraisingPanelProps = {
  fundraising: FundraisingData | null;
  onSave: (data: FundraisingData) => Promise<void>;
  settings: ModelSettings;
  projections: ProjectionData[];
  arr: number | null;
  stage?: StartupStage;
  currency?: string;
};

type ValuationMethod = 'vc' | 'dcf' | 'multiples';

function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function Tip({ text }: { text: string }) {
  return (
    <span className="inline-flex text-[var(--brand-muted)] cursor-help ml-1" title={text}>
      <Info size={14} />
    </span>
  );
}

export function FundraisingPanel({
  fundraising,
  onSave,
  settings,
  projections,
  arr,
  stage = "early_growth",
  currency: _currency = "USD",
}: FundraisingPanelProps) {
  const [targetRaise, setTargetRaise] = useState<string>(
    fundraising?.targetRaise != null ? String(fundraising.targetRaise) : ""
  );
  const [preMoneyValuation, setPreMoneyValuation] = useState<string>(
    fundraising?.preMoneyValuation != null ? String(fundraising.preMoneyValuation) : ""
  );
  const [runwayTarget, setRunwayTarget] = useState<string>(
    fundraising?.runwayTarget != null ? String(fundraising.runwayTarget) : ""
  );
  const [plannedClose, setPlannedClose] = useState<string>(
    fundraising?.plannedClose ?? ""
  );
  const [useEngineering, setUseEngineering] = useState<string>(
    String(fundraising?.useOfFunds?.engineering ?? 40)
  );
  const [useSales, setUseSales] = useState<string>(
    String(fundraising?.useOfFunds?.sales ?? 30)
  );
  const [useMarketing, setUseMarketing] = useState<string>(
    String(fundraising?.useOfFunds?.marketing ?? 20)
  );
  const [useOps, setUseOps] = useState<string>(
    String(fundraising?.useOfFunds?.ops ?? 10)
  );
  const [saving, setSaving] = useState(false);
  const [valuationMethod, setValuationMethod] = useState<ValuationMethod>('vc');
  const [exitMultiple, setExitMultiple] = useState<string>("10");
  const [targetReturn, setTargetReturn] = useState<string>("10");

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const eng = parseFloat(useEngineering) || 0;
      const sales = parseFloat(useSales) || 0;
      const marketing = parseFloat(useMarketing) || 0;
      const ops = parseFloat(useOps) || 0;
      await onSave({
        targetRaise: targetRaise !== "" ? parseFloat(targetRaise) : null,
        preMoneyValuation: preMoneyValuation !== "" ? parseFloat(preMoneyValuation) : null,
        useOfFunds: { engineering: eng, sales, marketing, ops },
        runwayTarget: runwayTarget !== "" ? parseInt(runwayTarget, 10) : null,
        plannedClose: plannedClose !== "" ? plannedClose : null,
      });
    } finally {
      setSaving(false);
    }
  }, [
    onSave,
    targetRaise,
    preMoneyValuation,
    runwayTarget,
    plannedClose,
    useEngineering,
    useSales,
    useMarketing,
    useOps,
  ]);

  const dcf =
    projections.length > 0
      ? calculateDCF(projections, settings.discountRate, settings.terminalGrowth)
      : null;

  const arrNum = arr ?? 0;
  const multiples = arrNum > 0
    ? calculateMultiplesValuation(arrNum, {
        arrMultiple: settings.arrMultiple != null ? Number(settings.arrMultiple) : undefined,
        revenueMultiple: settings.revenueMultiple != null ? Number(settings.revenueMultiple) : undefined,
        stage,
      })
    : null;

  const vcValuation = projections.length > 0
    ? calculateVCValuation(projections, {
        exitMultiple: parseFloat(exitMultiple) || 10,
        targetReturn: parseFloat(targetReturn) || 10,
        roundSize: parseFloat(targetRaise) || 0,
      })
    : null;

  const raiseNum = parseFloat(targetRaise) || 0;
  const preMoneyNum = parseFloat(preMoneyValuation) || 0;
  const postMoney = preMoneyNum + raiseNum;
  const dilution = postMoney > 0 ? (raiseNum / postMoney) * 100 : 0;

  const capTable = preMoneyNum > 0 && raiseNum > 0
    ? calculateCapTable(preMoneyNum, raiseNum, [
        { name: 'Founders', percent: 1.0 },
      ])
    : null;

  const useOfFundsTotal = (parseFloat(useEngineering) || 0) + (parseFloat(useSales) || 0) + (parseFloat(useMarketing) || 0) + (parseFloat(useOps) || 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--brand-ink)] mb-2">
          Fundraising
        </h2>
        <p className="text-sm text-[var(--brand-muted)]">
          Model your round, compare valuation methods, and see dilution impact.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Round Inputs */}
        <div className="bg-white rounded-xl border border-[var(--border-soft)] p-6">
          <h3 className="text-lg font-semibold text-[var(--brand-ink)] mb-4">
            Round inputs
          </h3>
          <div className="space-y-4">
            <div>
              <label className="flex items-center text-sm font-medium text-[var(--brand-muted)] mb-1">
                Target raise ($)<Tip text="How much capital you want to raise in this round." />
              </label>
              <input type="number" min={0} step={10000} value={targetRaise} onChange={(e) => setTargetRaise(e.target.value)} className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)]" placeholder="e.g. 500000" />
            </div>
            <div>
              <label className="flex items-center text-sm font-medium text-[var(--brand-muted)] mb-1">
                Pre-money valuation ($)<Tip text={TOOLTIPS.preMoney} />
              </label>
              <input type="number" min={0} step={100000} value={preMoneyValuation} onChange={(e) => setPreMoneyValuation(e.target.value)} className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)]" placeholder="e.g. 4000000" />
            </div>
            <div>
              <label className="flex items-center text-sm font-medium text-[var(--brand-muted)] mb-1">
                Runway target (months)<Tip text={TOOLTIPS.runway} />
              </label>
              <input type="number" min={0} value={runwayTarget} onChange={(e) => setRunwayTarget(e.target.value)} className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)]" placeholder="e.g. 18" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--brand-muted)] mb-1">Planned close</label>
              <input type="date" value={plannedClose} onChange={(e) => setPlannedClose(e.target.value)} className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">Use of funds (%)</label>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <input type="number" min={0} max={100} value={useEngineering} onChange={(e) => setUseEngineering(e.target.value)} className="px-3 py-2 border border-[var(--border-soft)] rounded-lg text-sm w-full" />
                  <p className="text-xs text-[var(--brand-muted)] mt-0.5 text-center">Eng</p>
                </div>
                <div>
                  <input type="number" min={0} max={100} value={useSales} onChange={(e) => setUseSales(e.target.value)} className="px-3 py-2 border border-[var(--border-soft)] rounded-lg text-sm w-full" />
                  <p className="text-xs text-[var(--brand-muted)] mt-0.5 text-center">Sales</p>
                </div>
                <div>
                  <input type="number" min={0} max={100} value={useMarketing} onChange={(e) => setUseMarketing(e.target.value)} className="px-3 py-2 border border-[var(--border-soft)] rounded-lg text-sm w-full" />
                  <p className="text-xs text-[var(--brand-muted)] mt-0.5 text-center">Mkt</p>
                </div>
                <div>
                  <input type="number" min={0} max={100} value={useOps} onChange={(e) => setUseOps(e.target.value)} className="px-3 py-2 border border-[var(--border-soft)] rounded-lg text-sm w-full" />
                  <p className="text-xs text-[var(--brand-muted)] mt-0.5 text-center">Ops</p>
                </div>
              </div>
              {useOfFundsTotal !== 100 && useOfFundsTotal > 0 && (
                <p className="text-xs text-amber-600 mt-1">Total: {useOfFundsTotal}% (should be 100%)</p>
              )}
            </div>
            <button type="button" onClick={handleSave} disabled={saving} className="px-6 py-2 bg-[var(--brand-primary)] text-white font-semibold rounded-xl hover:bg-[#3F38A4] disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Valuation & Dilution */}
        <div className="space-y-6">
          {/* Dilution Summary */}
          {raiseNum > 0 && preMoneyNum > 0 && (
            <div className="bg-white rounded-xl border border-[var(--border-soft)] p-6">
              <h3 className="flex items-center text-lg font-semibold text-[var(--brand-ink)] mb-4">
                Dilution & Cap Table<Tip text={TOOLTIPS.dilution} />
              </h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="rounded-lg bg-[var(--surface-muted)] p-3">
                  <p className="text-xs text-[var(--brand-muted)]">Post-money</p>
                  <p className="text-lg font-bold text-[var(--brand-ink)]">{formatCompact(postMoney)}</p>
                </div>
                <div className="rounded-lg bg-[var(--surface-muted)] p-3">
                  <p className="text-xs text-[var(--brand-muted)]">Dilution</p>
                  <p className="text-lg font-bold text-[var(--brand-ink)]">{dilution.toFixed(1)}%</p>
                </div>
                <div className="rounded-lg bg-[var(--surface-muted)] p-3">
                  <p className="text-xs text-[var(--brand-muted)]">Founder ownership</p>
                  <p className="text-lg font-bold text-[var(--brand-ink)]">{(100 - dilution).toFixed(1)}%</p>
                </div>
              </div>
              {capTable && (
                <div className="border border-[var(--border-soft)] rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[var(--surface-muted)]">
                        <th className="text-left px-3 py-2 text-[var(--brand-muted)] font-medium">Shareholder</th>
                        <th className="text-right px-3 py-2 text-[var(--brand-muted)] font-medium">Ownership</th>
                        <th className="text-right px-3 py-2 text-[var(--brand-muted)] font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {capTable.entries.map((entry) => (
                        <tr key={entry.name} className="border-t border-[var(--border-soft)]">
                          <td className="px-3 py-2 text-[var(--brand-ink)]">{entry.name}</td>
                          <td className="px-3 py-2 text-right text-[var(--brand-ink)]">{(entry.ownership * 100).toFixed(1)}%</td>
                          <td className="px-3 py-2 text-right text-[var(--brand-ink)]">{formatCompact(entry.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Valuation Comparison */}
          <div className="bg-white rounded-xl border border-[var(--border-soft)] p-6">
            <h3 className="text-lg font-semibold text-[var(--brand-ink)] mb-4">
              Valuation comparison
            </h3>
            <div className="flex gap-2 mb-4">
              {(['vc', 'multiples', 'dcf'] as ValuationMethod[]).map((m) => (
                <button key={m} onClick={() => setValuationMethod(m)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${valuationMethod === m ? "bg-[var(--brand-primary)] text-white" : "bg-[var(--surface-muted)] text-[var(--brand-muted)]"}`}>
                  {m === 'vc' ? 'VC Method' : m === 'dcf' ? 'DCF' : 'Multiples'}
                </button>
              ))}
            </div>

            {valuationMethod === 'vc' && (
              <div className="space-y-4">
                <p className="text-xs text-[var(--brand-muted)]">{TOOLTIPS.vcMethod}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[var(--brand-muted)] mb-1">Exit revenue multiple</label>
                    <input type="number" min={1} step={1} value={exitMultiple} onChange={(e) => setExitMultiple(e.target.value)} className="w-full px-3 py-2 border border-[var(--border-soft)] rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--brand-muted)] mb-1">Target return (x)</label>
                    <input type="number" min={1} step={1} value={targetReturn} onChange={(e) => setTargetReturn(e.target.value)} className="w-full px-3 py-2 border border-[var(--border-soft)] rounded-lg text-sm" />
                  </div>
                </div>
                {vcValuation && (
                  <div className="rounded-xl border border-[var(--border-soft)] p-4">
                    <p className="text-sm text-[var(--brand-muted)] mb-1">Implied pre-money (VC method)</p>
                    <p className="text-2xl font-bold text-[var(--brand-primary)]">{formatCompact(vcValuation.impliedPreMoney)}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[var(--brand-muted)]">
                      <p>Expected exit: {formatCompact(vcValuation.expectedExitValue)}</p>
                      <p>Dilution: {vcValuation.dilutionPercent.toFixed(1)}%</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {valuationMethod === 'dcf' && (
              <div className="space-y-4">
                <p className="text-xs text-[var(--brand-muted)]">{TOOLTIPS.dcf}</p>
                {dcf != null ? (
                  <div className="rounded-xl border border-[var(--border-soft)] p-4">
                    <p className="text-sm text-[var(--brand-muted)] mb-1">Enterprise value (DCF)</p>
                    <p className="text-2xl font-bold text-[var(--brand-primary)]">{formatCompact(dcf.enterpriseValue)}</p>
                    <p className="text-xs text-[var(--brand-muted)] mt-1">
                      WACC {(settings.discountRate * 100).toFixed(0)}%, terminal growth {(settings.terminalGrowth * 100).toFixed(0)}%
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--brand-muted)]">Add projections in the Results tab to see DCF valuation.</p>
                )}
              </div>
            )}

            {valuationMethod === 'multiples' && (
              <div className="space-y-4">
                <p className="text-xs text-[var(--brand-muted)]">Valuation based on ARR multiplied by a stage-appropriate multiple. This is how most seed-stage investors think about pricing.</p>
                {multiples != null ? (
                  <div className="rounded-xl border border-[var(--border-soft)] p-4">
                    <p className="text-sm text-[var(--brand-muted)] mb-1">ARR-based valuation ({multiples.arrMultipleUsed}x ARR)</p>
                    <p className="text-2xl font-bold text-[var(--brand-ink)]">{formatCompact(multiples.arrBasedValuation)}</p>
                    <p className="text-xs text-[var(--brand-muted)] mt-1">Blended: {formatCompact(multiples.blendedValuation)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--brand-muted)]">Add ARR data (Traction or Metrics tab) to see multiples valuation.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
