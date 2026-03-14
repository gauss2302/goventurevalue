"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { logger } from "@/lib/logger";
import { TOOLTIPS } from "@/lib/tooltips";

export type MonthlyMetricRow = {
  id?: number;
  month: string; // YYYY-MM-DD
  mrr: number | null;
  newMrr: number | null;
  expansionMrr: number | null;
  contractionMrr: number | null;
  churnedMrr: number | null;
  customers: number | null;
  newCustomers: number | null;
  churnedCustomers: number | null;
  gmv: number | null;
  revenue: number | null;
  grossProfit: number | null;
  opex: number | null;
  cashBalance: number | null;
  headcount: number | null;
  marketingSpend: number | null;
};

const emptyRow = (month: string): MonthlyMetricRow => ({
  month,
  mrr: null,
  newMrr: null,
  expansionMrr: null,
  contractionMrr: null,
  churnedMrr: null,
  customers: null,
  newCustomers: null,
  churnedCustomers: null,
  gmv: null,
  revenue: null,
  grossProfit: null,
  opex: null,
  cashBalance: null,
  headcount: null,
  marketingSpend: null,
});

function formatMonth(monthStr: string): string {
  try {
    const d = new Date(monthStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  } catch {
    return monthStr;
  }
}

type MonthlyMetricsTableProps = {
  modelId: number;
  rows: MonthlyMetricRow[];
  onSave: (rows: MonthlyMetricRow[]) => Promise<void>;
  currency: string;
  saving?: boolean;
};

export function MonthlyMetricsTable({
  modelId: _modelId,
  rows: initialRows,
  onSave,
  currency: _currency,
  saving = false,
}: MonthlyMetricsTableProps) {
  const [rows, setRows] = useState<MonthlyMetricRow[]>(initialRows);
  const [savingState, setSavingState] = useState(saving);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const updateCell = useCallback(
    (index: number, field: keyof Omit<MonthlyMetricRow, "id" | "month">, value: number | null) => {
      setRows((prev) => {
        const next = [...prev];
        const row = { ...next[index], [field]: value };
        next[index] = row;
        return next;
      });
    },
    []
  );

  const addMonth = useCallback(() => {
    const lastMonth = rows.length > 0 ? rows[rows.length - 1].month : null;
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
    setRows((prev) => [...prev, emptyRow(nextMonth)]);
  }, [rows.length]);

  const removeRow = useCallback((index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(async () => {
    setSavingState(true);
    try {
      await onSave(rows);
      toast.success("Monthly metrics saved");
    } catch (err) {
      logger.error("Failed to save monthly metrics:", err);
      const message = err instanceof Error ? err.message : "Failed to save";
      toast.error(message);
    } finally {
      setSavingState(false);
    }
  }, [rows, onSave]);

  const cols: { key: keyof Omit<MonthlyMetricRow, "id" | "month">; label: string; width?: string; tooltip?: string }[] = [
    { key: "mrr", label: "MRR", width: "90px", tooltip: TOOLTIPS.mrr },
    { key: "newMrr", label: "New MRR", width: "90px", tooltip: "New MRR added from newly acquired customers this month." },
    { key: "expansionMrr", label: "Expansion", width: "90px", tooltip: TOOLTIPS.expansionRate },
    { key: "churnedMrr", label: "Churned", width: "90px", tooltip: "MRR lost from customers who cancelled this month." },
    { key: "customers", label: "Customers", width: "80px" },
    { key: "revenue", label: "Revenue", width: "90px" },
    { key: "opex", label: "Opex", width: "90px" },
    { key: "cashBalance", label: "Cash", width: "90px" },
    { key: "marketingSpend", label: "Marketing", width: "90px", tooltip: TOOLTIPS.cac },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--brand-ink)]">
          Monthly traction
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addMonth}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-[var(--border-soft)] text-[var(--brand-ink)] hover:bg-[var(--surface-muted)]"
          >
            Add month
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

      <div className="overflow-x-auto rounded-xl border border-[var(--border-soft)] bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[var(--page)] border-b border-[var(--border-soft)]">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-[var(--brand-muted)] sticky left-0 bg-[var(--page)] min-w-[100px]">
                Month
              </th>
              {cols.map((c) => (
                <th
                  key={c.key}
                  className="text-right px-2 py-2 font-medium text-[var(--brand-muted)] whitespace-nowrap"
                  style={{ width: c.width, minWidth: c.width }}
                >
                  <span className="inline-flex items-center justify-end gap-1">
                    {c.label}
                    {c.tooltip && (
                      <span className="cursor-help" title={c.tooltip}>
                        <Info size={12} className="opacity-50" />
                      </span>
                    )}
                  </span>
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-muted-border)]">
            {rows.map((row, index) => (
              <tr key={row.month + index} className="hover:bg-[var(--page)]">
                <td className="px-3 py-2 font-medium text-[var(--brand-ink)] sticky left-0 bg-white whitespace-nowrap">
                  {formatMonth(row.month)}
                </td>
                {cols.map((c) => (
                  <td key={c.key} className="px-2 py-1">
                    <input
                      type="number"
                      step={c.key.includes("Mrr") || c.key === "revenue" || c.key === "opex" || c.key === "cashBalance" || c.key === "marketingSpend" ? 100 : 1}
                      min={0}
                      value={row[c.key] ?? ""}
                      onChange={(e) => {
                        const v = e.target.value === "" ? null : parseFloat(e.target.value);
                        updateCell(index, c.key, Number.isFinite(v) ? v : null);
                      }}
                      className="w-full text-right px-2 py-1 border border-[var(--border-soft)] rounded focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                      placeholder="—"
                    />
                  </td>
                ))}
                <td className="px-2 py-1">
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="text-[var(--brand-muted)] hover:text-red-600 text-xs"
                    aria-label="Remove row"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-[var(--brand-muted)]">
          No monthly data yet. Click &quot;Add month&quot; to add your first month.
        </p>
      )}
    </div>
  );
}
