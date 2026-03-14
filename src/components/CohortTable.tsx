"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { logger } from "@/lib/logger";
import { calculateCohortMetrics } from "@/lib/traction-calculations";
import { TOOLTIPS } from "@/lib/tooltips";

export type CohortRow = {
  id?: number;
  cohortMonth: string;
  cohortSize: number;
  retentionByMonth: number[]; // 0–1
  revenueByMonth?: number[] | null;
};

const MAX_MONTHS = 13; // M0..M12

function defaultRetention(): number[] {
  return Array.from({ length: MAX_MONTHS }, (_, i) => (i === 0 ? 1 : 0));
}

function formatCohortMonth(monthStr: string): string {
  try {
    const d = new Date(monthStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  } catch {
    return monthStr;
  }
}

type CohortTableProps = {
  modelId: number;
  rows: CohortRow[];
  onSave: (rows: CohortRow[]) => Promise<void>;
  saving?: boolean;
};

export function CohortTable({
  modelId: _modelId,
  rows: initialRows,
  onSave,
  saving = false,
}: CohortTableProps) {
  const [rows, setRows] = useState<CohortRow[]>(initialRows);
  const [savingState, setSavingState] = useState(saving);

  useEffect(() => {
    setRows(
      initialRows.map((r) => ({
        ...r,
        retentionByMonth:
          r.retentionByMonth?.length > 0
            ? [...r.retentionByMonth]
            : defaultRetention(),
      }))
    );
  }, [initialRows]);

  const updateRetention = useCallback(
    (index: number, monthIndex: number, value: number) => {
      const v = Math.max(0, Math.min(1, value));
      setRows((prev) => {
        const next = [...prev];
        const row = next[index];
        const ret = [...(row.retentionByMonth ?? defaultRetention())];
        while (ret.length <= monthIndex) ret.push(0);
        ret[monthIndex] = v;
        next[index] = { ...row, retentionByMonth: ret };
        return next;
      });
    },
    []
  );

  const updateCell = useCallback(
    (
      index: number,
      field: "cohortMonth" | "cohortSize",
      value: string | number
    ) => {
      setRows((prev) => {
        const next = [...prev];
        const row = { ...next[index], [field]: value };
        if (field === "cohortSize")
          row.cohortSize = Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0);
        next[index] = row;
        return next;
      });
    },
    []
  );

  const addCohort = useCallback(() => {
    const lastMonth =
      rows.length > 0 ? rows[rows.length - 1].cohortMonth : null;
    let nextMonth: string;
    if (lastMonth) {
      const d = new Date(lastMonth + "T00:00:00");
      d.setMonth(d.getMonth() + 1);
      nextMonth = d.toISOString().slice(0, 10);
    } else {
      const d = new Date();
      d.setMonth(d.getMonth());
      d.setDate(1);
      nextMonth = d.toISOString().slice(0, 10);
    }
    setRows((prev) => [
      ...prev,
      {
        cohortMonth: nextMonth,
        cohortSize: 0,
        retentionByMonth: defaultRetention(),
      },
    ]);
  }, [rows.length]);

  const removeRow = useCallback((index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(async () => {
    setSavingState(true);
    try {
      await onSave(rows);
      toast.success("Cohorts saved");
    } catch (err) {
      logger.error("Failed to save cohorts:", err);
      const message = err instanceof Error ? err.message : "Failed to save";
      toast.error(message);
    } finally {
      setSavingState(false);
    }
  }, [rows, onSave]);

  const cohortMetrics = rows.length > 0
    ? calculateCohortMetrics(
        rows.map((r) => ({
          cohortMonth: r.cohortMonth,
          cohortSize: r.cohortSize,
          retentionByMonth: r.retentionByMonth ?? defaultRetention(),
          revenueByMonth: r.revenueByMonth ?? undefined,
        }))
      )
    : null;

  const retentionColor = (rate: number): string => {
    if (rate >= 0.8) return "bg-emerald-500";
    if (rate >= 0.6) return "bg-emerald-400";
    if (rate >= 0.4) return "bg-amber-400";
    if (rate >= 0.2) return "bg-orange-400";
    if (rate > 0) return "bg-red-400";
    return "bg-[var(--surface-muted)]";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--brand-ink)]">
          Cohort retention
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addCohort}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-[var(--border-soft)] text-[var(--brand-ink)] hover:bg-[var(--surface-muted)]"
          >
            Add cohort
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={savingState || rows.length === 0}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-[var(--brand-primary)] text-white hover:bg-[#3F38A4] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingState ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Retention triangle input table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border-soft)] bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[var(--page)] border-b border-[var(--border-soft)]">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-[var(--brand-muted)] sticky left-0 bg-[var(--page)] min-w-[100px]">
                Cohort month
              </th>
              <th className="text-right px-2 py-2 font-medium text-[var(--brand-muted)] w-24">
                Size
              </th>
              {Array.from({ length: MAX_MONTHS }, (_, i) => (
                <th
                  key={i}
                  className="text-right px-1 py-2 font-medium text-[var(--brand-muted)] w-14"
                >
                  M{i}
                </th>
              ))}
              <th className="w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-muted-border)]">
            {rows.map((row, index) => (
              <tr key={row.cohortMonth + index} className="hover:bg-[var(--page)]">
                <td className="px-3 py-2 font-medium text-[var(--brand-ink)] sticky left-0 bg-white whitespace-nowrap">
                  <input
                    type="date"
                    value={row.cohortMonth}
                    onChange={(e) =>
                      updateCell(index, "cohortMonth", e.target.value)
                    }
                    className="w-full text-sm px-2 py-1 border border-[var(--border-soft)] rounded focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="number"
                    min={0}
                    value={row.cohortSize}
                    onChange={(e) =>
                      updateCell(index, "cohortSize", e.target.value)
                    }
                    className="w-full text-right px-2 py-1 border border-[var(--border-soft)] rounded focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                </td>
                {Array.from({ length: MAX_MONTHS }, (_, m) => (
                  <td key={m} className="px-1 py-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={
                        row.retentionByMonth?.[m] != null
                          ? Math.round((row.retentionByMonth[m] ?? 0) * 100)
                          : ""
                      }
                      onChange={(e) => {
                        const v = e.target.value === "" ? 0 : parseFloat(e.target.value) / 100;
                        updateRetention(index, m, Number.isFinite(v) ? v : 0);
                      }}
                      className="w-full text-right px-1 py-0.5 border border-[var(--border-soft)] rounded text-xs focus:ring-1 focus:ring-[var(--brand-primary)]"
                      placeholder="%"
                    />
                  </td>
                ))}
                <td className="px-2 py-1">
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="text-[var(--brand-muted)] hover:text-red-600 text-xs"
                    aria-label="Remove cohort"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Heatmap */}
      {rows.length > 0 && (
        <div className="rounded-xl border border-[var(--border-soft)] bg-white p-4">
          <h4 className="text-sm font-semibold text-[var(--brand-ink)] mb-3">
            Retention heatmap
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-1 pr-2 text-[var(--brand-muted)] font-medium">
                    Cohort
                  </th>
                  {Array.from({ length: MAX_MONTHS }, (_, i) => (
                    <th
                      key={i}
                      className="text-center py-1 px-0.5 text-[var(--brand-muted)] font-medium w-8"
                    >
                      M{i}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...rows]
                  .sort(
                    (a, b) =>
                      new Date(a.cohortMonth).getTime() -
                      new Date(b.cohortMonth).getTime()
                  )
                  .map((row, idx) => (
                    <tr key={row.cohortMonth + idx}>
                      <td className="py-0.5 pr-2 text-[var(--brand-ink)] whitespace-nowrap">
                        {formatCohortMonth(row.cohortMonth)}
                      </td>
                      {Array.from({ length: MAX_MONTHS }, (_, m) => {
                        const rate = row.retentionByMonth?.[m] ?? 0;
                        return (
                          <td
                            key={m}
                            className={`py-0.5 px-0.5 text-center min-w-[24px] ${retentionColor(rate)} text-white font-medium`}
                            title={`${Math.round(rate * 100)}%`}
                          >
                            {rate > 0 ? Math.round(rate * 100) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary from calculateCohortMetrics */}
      {cohortMetrics && rows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-[var(--border-soft)] p-4 bg-white">
            <p className="text-xs text-[var(--brand-muted)] uppercase tracking-wide flex items-center gap-1">
              Avg retention (by month)
              <span className="cursor-help" title={TOOLTIPS.grossRetention}>
                <Info size={12} className="opacity-50" />
              </span>
            </p>
            <p className="text-sm text-[var(--brand-ink)] mt-1">
              M1: {Math.round((cohortMetrics.averageRetention[1] ?? 0) * 100)}%
              {" · "}
              M3: {Math.round((cohortMetrics.averageRetention[3] ?? 0) * 100)}%
              {" · "}
              M6: {Math.round((cohortMetrics.averageRetention[6] ?? 0) * 100)}%
              {" · "}
              M12: {Math.round((cohortMetrics.averageRetention[12] ?? 0) * 100)}%
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border-soft)] p-4 bg-white">
            <p className="text-xs text-[var(--brand-muted)] uppercase tracking-wide flex items-center gap-1">
              Weighted NRR
              <span className="cursor-help" title={TOOLTIPS.nrr}>
                <Info size={12} className="opacity-50" />
              </span>
            </p>
            <p className="text-lg font-semibold text-[var(--brand-ink)] mt-1">
              {Math.round(cohortMetrics.weightedNRR * 100)}%
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border-soft)] p-4 bg-white">
            <p className="text-xs text-[var(--brand-muted)] uppercase tracking-wide flex items-center gap-1">
              Median payback (month)
              <span className="cursor-help" title={TOOLTIPS.paybackMonths}>
                <Info size={12} className="opacity-50" />
              </span>
            </p>
            <p className="text-lg font-semibold text-[var(--brand-ink)] mt-1">
              {cohortMetrics.medianPayback}
            </p>
          </div>
        </div>
      )}

      {rows.length === 0 && (
        <p className="text-sm text-[var(--brand-muted)]">
          No cohorts yet. Click &quot;Add cohort&quot; to add your first cohort month.
        </p>
      )}
    </div>
  );
}
