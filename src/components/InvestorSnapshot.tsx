"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Info } from "lucide-react";
import type { MonthlyMetricRow } from "./MonthlyMetricsTable";
import { computeDerivedMetrics } from "@/lib/traction-calculations";
import { TOOLTIPS } from "@/lib/tooltips";

type InvestorSnapshotProps = {
  monthlyMetrics: MonthlyMetricRow[];
  currency?: string;
  /** Legacy flat metrics (fallback when no monthly data) */
  legacyMetrics?: {
    mrr?: number | null;
    arr?: number | null;
    burnRate?: number | null;
    runwayMonths?: number | null;
    ltvCac?: number | null;
    grossMargin?: number | null;
  } | null;
};

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function InvestorSnapshot({
  monthlyMetrics,
  currency: _currency = "USD",
  legacyMetrics,
}: InvestorSnapshotProps) {
  const sorted = [...monthlyMetrics].sort(
    (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()
  );
  const latest = sorted[sorted.length - 1];
  const previous = sorted.length >= 2 ? sorted[sorted.length - 2] : null;

  const derived = latest
    ? computeDerivedMetrics(
        {
          month: latest.month,
          mrr: latest.mrr,
          newMrr: latest.newMrr,
          expansionMrr: latest.expansionMrr,
          contractionMrr: latest.contractionMrr,
          churnedMrr: latest.churnedMrr,
          customers: latest.customers,
          newCustomers: latest.newCustomers,
          churnedCustomers: latest.churnedCustomers,
          gmv: latest.gmv,
          revenue: latest.revenue,
          grossProfit: latest.grossProfit,
          opex: latest.opex,
          cashBalance: latest.cashBalance,
          headcount: latest.headcount,
          marketingSpend: latest.marketingSpend,
        },
        previous
          ? {
              month: previous.month,
              mrr: previous.mrr,
              newMrr: previous.newMrr,
              expansionMrr: previous.expansionMrr,
              contractionMrr: previous.contractionMrr,
              churnedMrr: previous.churnedMrr,
              customers: previous.customers,
              newCustomers: previous.newCustomers,
              churnedCustomers: previous.churnedCustomers,
              gmv: previous.gmv,
              revenue: previous.revenue,
              grossProfit: previous.grossProfit,
              opex: previous.opex,
              cashBalance: previous.cashBalance,
              headcount: previous.headcount,
              marketingSpend: previous.marketingSpend,
            }
          : null
      )
    : null;

  const arr = derived?.arr ?? legacyMetrics?.arr ?? (legacyMetrics?.mrr != null ? legacyMetrics.mrr * 12 : null);
  const mrrGrowth = derived?.mrrGrowthRate ?? null;
  const nrr = derived?.netRevenueRetention ?? null;
  const ltvCac = derived?.ltvCac ?? legacyMetrics?.ltvCac ?? null;
  const burnMultiple = derived?.burnMultiple ?? null;
  const runway = derived?.runwayMonths ?? legacyMetrics?.runwayMonths ?? null;
  const grossMargin = derived?.grossMargin ?? legacyMetrics?.grossMargin ?? null;
  const burnRate = derived?.burnRate ?? legacyMetrics?.burnRate ?? null;

  const chartData = sorted.map((r) => ({
    month: new Date(r.month + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    }),
    mrr: r.mrr ?? 0,
    arr: (r.mrr ?? 0) * 12,
  }));

  const kpis = [
    { label: "ARR", value: arr != null ? `$${formatCompact(arr)}` : "—", highlight: true, tooltip: TOOLTIPS.arr },
    { label: "MRR growth", value: formatPercent(mrrGrowth), tooltip: TOOLTIPS.mrrGrowth },
    { label: "NRR", value: formatPercent(nrr), tooltip: TOOLTIPS.nrr },
    { label: "LTV:CAC", value: ltvCac != null ? `${ltvCac.toFixed(1)}x` : "—", highlight: ltvCac != null && ltvCac >= 3, tooltip: TOOLTIPS.ltvCac },
    { label: "Burn multiple", value: burnMultiple != null ? `${burnMultiple.toFixed(1)}x` : "—", tooltip: TOOLTIPS.burnMultiple },
    { label: "Runway", value: runway != null ? `${runway.toFixed(0)} mo` : "—", tooltip: TOOLTIPS.runway },
  ];

  const hasAnyKpi = kpis.some((k) => k.value !== "—");
  const hasChart = chartData.length >= 2;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--brand-ink)] mb-2">
          Investor Snapshot
        </h2>
        <p className="text-sm text-[var(--brand-muted)]">
          Key traction KPIs and revenue trajectory. Add monthly data in the Traction tab to populate.
        </p>
      </div>

      {hasAnyKpi && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map((k) => (
            <div
              key={k.label}
              className={`rounded-xl border border-[var(--border-soft)] p-4 ${
                k.highlight ? "bg-[rgba(79,70,186,0.08)] border-[rgba(79,70,186,0.2)]" : "bg-white"
              }`}
            >
              <p className="text-xs text-[var(--brand-muted)] mb-1 flex items-center gap-1">
                {k.label}
                {k.tooltip && (
                  <span className="cursor-help" title={k.tooltip}>
                    <Info size={11} className="opacity-50" />
                  </span>
                )}
              </p>
              <p
                className={`text-lg font-bold ${
                  k.highlight ? "text-[var(--brand-primary)]" : "text-[var(--brand-ink)]"
                }`}
              >
                {k.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {hasChart && (
        <div className="bg-white rounded-xl border border-[var(--border-soft)] p-6">
          <h3 className="text-lg font-semibold text-[var(--brand-ink)] mb-4">
            MRR trajectory
          </h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-muted-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--brand-muted)" />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="var(--brand-muted)"
                  tickFormatter={(v) => formatCompact(v)}
                />
                <Tooltip
                  formatter={(value: number) => [formatCompact(value), "MRR"]}
                  labelFormatter={(label) => label}
                  contentStyle={{
                    backgroundColor: "var(--page)",
                    border: "1px solid var(--border-soft)",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="mrr"
                  stroke="var(--brand-primary)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="MRR"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {(derived?.cac != null || derived?.ltv != null || grossMargin != null || burnRate != null) && (
        <div className="bg-white rounded-xl border border-[var(--border-soft)] p-6">
          <h3 className="text-lg font-semibold text-[var(--brand-ink)] mb-4">
            Unit economics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {derived?.cac != null && (
              <div>
                <p className="text-xs text-[var(--brand-muted)] flex items-center gap-1">CAC <span className="cursor-help" title={TOOLTIPS.cac}><Info size={11} className="opacity-50" /></span></p>
                <p className="font-semibold text-[var(--brand-ink)]">${formatCompact(derived.cac)}</p>
              </div>
            )}
            {derived?.ltv != null && (
              <div>
                <p className="text-xs text-[var(--brand-muted)] flex items-center gap-1">LTV <span className="cursor-help" title={TOOLTIPS.ltv}><Info size={11} className="opacity-50" /></span></p>
                <p className="font-semibold text-[var(--brand-ink)]">${formatCompact(derived.ltv)}</p>
              </div>
            )}
            {grossMargin != null && (
              <div>
                <p className="text-xs text-[var(--brand-muted)] flex items-center gap-1">Gross margin <span className="cursor-help" title={TOOLTIPS.grossMargin}><Info size={11} className="opacity-50" /></span></p>
                <p className="font-semibold text-[var(--brand-ink)]">{grossMargin.toFixed(0)}%</p>
              </div>
            )}
            {burnRate != null && (
              <div>
                <p className="text-xs text-[var(--brand-muted)] flex items-center gap-1">Burn rate <span className="cursor-help" title={TOOLTIPS.burnRate}><Info size={11} className="opacity-50" /></span></p>
                <p className="font-semibold text-[var(--brand-ink)]">${formatCompact(burnRate)}/mo</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!hasAnyKpi && !hasChart && (
        <p className="text-sm text-[var(--brand-muted)]">
          Enter metrics in the Metrics tab or add monthly data in Traction to see your investor snapshot.
        </p>
      )}
    </div>
  );
}
