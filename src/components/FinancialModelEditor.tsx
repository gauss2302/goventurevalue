import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import type { ScenarioType, UpdateScenarioDto, UpdateSettingsDto, MarketSizingDto, UpdateMetricsDto } from "@/lib/dto";
import type { ModelSettings, MarketSizing, ScenarioParams, TractionSeed } from "@/lib/calculations";
import { calculateProjections, DEFAULT_COST_STRUCTURE } from "@/lib/calculations";
import { TOOLTIPS } from "@/lib/tooltips";
import FinancialModel from "./FinancialModel";
import { MonthlyMetricsTable, type MonthlyMetricRow } from "./MonthlyMetricsTable";
import { CohortTable, type CohortRow } from "./CohortTable";
import { InvestorSnapshot } from "./InvestorSnapshot";
import { FundraisingPanel, type FundraisingData } from "./FundraisingPanel";

type FinancialModelEditorProps = {
  modelId: number;
  initialScenarios: Array<{
    scenarioType: ScenarioType;
    userGrowth: string;
    arpu: string;
    churnRate: string;
    cac: string;
    expansionRate?: string;
    grossMarginTarget?: string;
    revenueGrowthRate?: string;
    farmerGrowth?: string;
  }>;
  initialSettings: ModelSettings;
  initialMarket: MarketSizing;
  updateScenarioFn: (data: {
    modelId: number;
    scenarioType: ScenarioType;
    data: UpdateScenarioDto;
  }) => Promise<{ success: boolean }>;
  updateSettingsFn: (data: {
    modelId: number;
    data: UpdateSettingsDto;
  }) => Promise<{ success: boolean }>;
  updateMarketSizingFn: (data: {
    modelId: number;
    data: MarketSizingDto;
  }) => Promise<{ success: boolean }>;
  updateMetricsFn: (data: {
    modelId: number;
    data: UpdateMetricsDto;
  }) => Promise<{ success: boolean }>;
  upsertMonthlyMetricsFn?: (input: {
    modelId: number;
    rows: Omit<MonthlyMetricRow, "id">[];
  }) => Promise<{ success: boolean }>;
  upsertCohortsFn?: (input: {
    modelId: number;
    cohorts: Omit<CohortRow, "id">[];
  }) => Promise<{ success: boolean }>;
  updateFundraisingFn?: (data: FundraisingData) => Promise<void>;
  initialMetrics: ModelMetrics | null;
  initialMonthlyMetrics?: MonthlyMetricRow[];
  initialCohorts?: CohortRow[];
  initialFundraising?: FundraisingData | null;
};

type EditorTab = "snapshot" | "traction" | "cohorts" | "scenarios" | "market" | "metrics" | "fundraising" | "settings" | "results";

type ModelMetrics = {
  usersTotal: number | null;
  dau: number | null;
  mau: number | null;
  growthRate: number | null;
  activationRate: number | null;
  retentionRate: number | null;
  churnRate: number | null;
  mrr: number | null;
  arr: number | null;
  arpu: number | null;
  revenueGrowthRate: number | null;
  expansionRevenue: number | null;
  contractionRevenue: number | null;
  cac: number | null;
  ltv: number | null;
  ltvCac: number | null;
  paybackPeriodMonths: number | null;
  conversionRate: number | null;
  cpl: number | null;
  salesCycleLengthDays: number | null;
  winRate: number | null;
  dauMauRatio: number | null;
  featureAdoptionRate: number | null;
  timeToValueDays: number | null;
  nps: number | null;
  burnRate: number | null;
  runwayMonths: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
};

const normalizeRateInput = (value: number, min: number, max: number) => {
  const finite = Number.isFinite(value) ? value : 0;
  const fraction = Math.abs(finite) > 1 ? finite / 100 : finite;
  return Math.min(max, Math.max(min, fraction));
};

export default function FinancialModelEditor({
  modelId,
  initialScenarios,
  initialSettings,
  initialMarket,
  initialMetrics,
  initialMonthlyMetrics = [],
  updateScenarioFn,
  updateSettingsFn,
  updateMarketSizingFn,
  updateMetricsFn,
  upsertMonthlyMetricsFn,
  upsertCohortsFn,
  updateFundraisingFn,
  initialCohorts = [],
  initialFundraising = null,
}: FinancialModelEditorProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<EditorTab>("snapshot");
  const [activeScenarioTab, setActiveScenarioTab] = useState<ScenarioType>("base");
  const [scenario, setScenario] = useState<ScenarioType>("base");

  // Local state for editing
  const [scenarios, setScenarios] = useState(() => {
    const map = new Map<ScenarioType, ScenarioParams>();
    initialScenarios.forEach((s) => {
      const arpu = parseFloat(s.arpu);
      const cac = parseFloat(s.cac);
      map.set(s.scenarioType, {
        userGrowth: normalizeRateInput(parseFloat(s.userGrowth), -0.95, 3),
        arpu: Number.isFinite(arpu) ? arpu : 0,
        churnRate: normalizeRateInput(parseFloat(s.churnRate), 0.001, 0.95),
        cac: Number.isFinite(cac) ? cac : 0,
        expansionRate: normalizeRateInput(parseFloat(s.expansionRate ?? '0'), 0, 1),
        grossMarginTarget: normalizeRateInput(parseFloat(s.grossMarginTarget ?? '0.75'), 0, 0.99),
        revenueGrowthRate: normalizeRateInput(parseFloat(s.revenueGrowthRate ?? '0'), -0.95, 5),
      });
    });
    return map;
  });

  const [settings, setSettings] = useState<ModelSettings>({
    ...initialSettings,
    taxRate: normalizeRateInput(initialSettings.taxRate, 0, 0.9),
    discountRate: normalizeRateInput(initialSettings.discountRate, 0.01, 0.95),
    terminalGrowth: normalizeRateInput(initialSettings.terminalGrowth, -0.2, 0.2),
  });
  const [market, setMarket] = useState<MarketSizing>(initialMarket);
  const [metrics, setMetrics] = useState<ModelMetrics>(
    initialMetrics || {
      usersTotal: null,
      dau: null,
      mau: null,
      growthRate: null,
      activationRate: null,
      retentionRate: null,
      churnRate: null,
      mrr: null,
      arr: null,
      arpu: null,
      revenueGrowthRate: null,
      expansionRevenue: null,
      contractionRevenue: null,
      cac: null,
      ltv: null,
      ltvCac: null,
      paybackPeriodMonths: null,
      conversionRate: null,
      cpl: null,
      salesCycleLengthDays: null,
      winRate: null,
      dauMauRatio: null,
      featureAdoptionRate: null,
      timeToValueDays: null,
      nps: null,
      burnRate: null,
      runwayMonths: null,
      grossMargin: null,
      operatingMargin: null,
    }
  );
  const [projections, setProjections] = useState<any[]>([]);

  // Loading states
  const [savingScenario, setSavingScenario] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingMarket, setSavingMarket] = useState(false);
  const [savingMetrics, setSavingMetrics] = useState(false);

  const tractionSeed: TractionSeed | null = (() => {
    const sorted = [...initialMonthlyMetrics].sort(
      (a, b) => new Date(b.month).getTime() - new Date(a.month).getTime()
    );
    const latest = sorted[0];
    if (!latest?.mrr && !latest?.customers) return null;
    const prev = sorted[1] ?? null;
    const churn = prev?.mrr && latest?.churnedMrr != null
      ? latest.churnedMrr / prev.mrr
      : null;
    return {
      latestMrr: latest.mrr ?? 0,
      latestCustomers: latest.customers ?? 0,
      latestChurnRate: churn,
      latestArpu: latest.customers && latest.customers > 0 && latest.mrr
        ? latest.mrr / latest.customers
        : null,
    };
  })();

  // Recalculate projections when any input changes
  useEffect(() => {
    const currentScenarioParams = scenarios.get(scenario) || {
      userGrowth: 0.25,
      arpu: 49,
      churnRate: 0.05,
      cac: 150,
      expansionRate: 0.05,
      grossMarginTarget: 0.75,
      revenueGrowthRate: 0.20,
    };
    const proj = calculateProjections(currentScenarioParams, settings, market, tractionSeed);
    setProjections(proj);
  }, [scenario, scenarios, settings, market, initialMonthlyMetrics]);

  const derivedMetrics = {
    arr:
      metrics.mrr != null ? metrics.mrr * 12 : metrics.arr,
    ltvCac:
      metrics.ltv != null && metrics.cac
        ? metrics.ltv / metrics.cac
        : metrics.ltvCac,
    dauMauRatio:
      metrics.dau != null && metrics.mau ? metrics.dau / metrics.mau : metrics.dauMauRatio,
  };

  // Save scenario
  const handleSaveScenario = useCallback(
    async (scenarioType: ScenarioType) => {
      const scenarioData = scenarios.get(scenarioType);
      if (!scenarioData) return;

      setSavingScenario(true);
      try {
        await updateScenarioFn({
          modelId,
          scenarioType,
          data: scenarioData,
        });
        try {
          await queryClient.invalidateQueries({
            queryKey: ["model", modelId],
          });
        } catch (invalidateError) {
          logger.warn("Scenario saved, but failed to refresh data:", invalidateError);
        }
      } catch (error) {
        logger.error("Failed to save scenario:", error);
        const message =
          (error as any)?.message ||
          (error as any)?.data?.message ||
          "Failed to save scenario. Please try again.";
        toast.error(message);
      } finally {
        setSavingScenario(false);
      }
    },
    [modelId, scenarios, updateScenarioFn, queryClient]
  );

  // Save settings
  const handleSaveSettings = useCallback(async () => {
    setSavingSettings(true);
    try {
      await updateSettingsFn({
        modelId,
        data: settings,
      });
      try {
        await queryClient.invalidateQueries({
          queryKey: ["model", modelId],
        });
      } catch (invalidateError) {
        logger.warn("Settings saved, but failed to refresh data:", invalidateError);
      }
    } catch (error) {
      logger.error("Failed to save settings:", error);
      const message =
        (error as any)?.message ||
        (error as any)?.data?.message ||
        "Failed to save settings. Please try again.";
      toast.error(message);
    } finally {
      setSavingSettings(false);
    }
  }, [modelId, settings, updateSettingsFn, queryClient]);

  // Save market sizing
  const handleSaveMarket = useCallback(async () => {
    setSavingMarket(true);
    try {
      await updateMarketSizingFn({
        modelId,
        data: market,
      });
      try {
        await queryClient.invalidateQueries({
          queryKey: ["model", modelId],
        });
      } catch (invalidateError) {
        logger.warn("Market sizing saved, but failed to refresh data:", invalidateError);
      }
    } catch (error) {
      logger.error("Failed to save market sizing:", error);
      const message =
        (error as any)?.message ||
        (error as any)?.data?.message ||
        "Failed to save market sizing. Please try again.";
      toast.error(message);
    } finally {
      setSavingMarket(false);
    }
  }, [modelId, market, updateMarketSizingFn, queryClient]);

  const handleSaveMetrics = useCallback(async () => {
    setSavingMetrics(true);
    try {
      await updateMetricsFn({
        modelId,
        data: {
          ...metrics,
          arr: derivedMetrics.arr ?? null,
          ltvCac: derivedMetrics.ltvCac ?? null,
          dauMauRatio: derivedMetrics.dauMauRatio ?? null,
        },
      });
      try {
        await queryClient.invalidateQueries({
          queryKey: ["model", modelId],
        });
      } catch (invalidateError) {
        logger.warn("Metrics saved, but failed to refresh data:", invalidateError);
      }
    } catch (error) {
      logger.error("Failed to save metrics:", error);
      const message =
        (error as any)?.message ||
        (error as any)?.data?.message ||
        "Failed to save metrics. Please try again.";
      toast.error(message);
    } finally {
      setSavingMetrics(false);
    }
  }, [modelId, metrics, derivedMetrics, updateMetricsFn, queryClient]);

  const updateMetricsField = useCallback(
    <K extends keyof ModelMetrics>(field: K, value: ModelMetrics[K]) => {
      setMetrics((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Update scenario field
  const updateScenarioField = useCallback(
    (scenarioType: ScenarioType, field: keyof ScenarioParams, value: number) => {
      setScenarios((prev) => {
        const newMap = new Map(prev);
        const current = newMap.get(scenarioType) || {
          userGrowth: 0.25,
          arpu: 49,
          churnRate: 0.05,
          cac: 150,
          expansionRate: 0.05,
          grossMarginTarget: 0.75,
          revenueGrowthRate: 0.20,
        };
        newMap.set(scenarioType, { ...current, [field]: value });
        return newMap;
      });
    },
    []
  );

  // Update settings field
  const updateSettingsField = useCallback(
    <K extends keyof ModelSettings>(field: K, value: ModelSettings[K]) => {
      setSettings((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Update market field
  const updateMarketField = useCallback(
    <K extends keyof MarketSizing>(field: K, value: MarketSizing[K]) => {
      setMarket((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const currentScenarioParams = scenarios.get(scenario) || {
    userGrowth: 0.25,
    arpu: 49,
    churnRate: 0.05,
    cac: 150,
    expansionRate: 0.05,
    grossMarginTarget: 0.75,
    revenueGrowthRate: 0.20,
  };

  const tabs = [
    { id: "snapshot" as EditorTab, label: "Snapshot", icon: "📋" },
    { id: "traction" as EditorTab, label: "Traction", icon: "📈" },
    { id: "cohorts" as EditorTab, label: "Cohorts", icon: "📊" },
    { id: "scenarios" as EditorTab, label: "Scenarios", icon: "🔄" },
    { id: "market" as EditorTab, label: "Market", icon: "🎯" },
    { id: "metrics" as EditorTab, label: "Metrics", icon: "📌" },
    { id: "fundraising" as EditorTab, label: "Fundraising", icon: "💰" },
    { id: "settings" as EditorTab, label: "Settings", icon: "⚙️" },
    { id: "results" as EditorTab, label: "Results", icon: "📉" },
  ];

  return (
    <div className="min-h-screen bg-[var(--page)]">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-[var(--border-soft)] sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 py-3 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-[rgba(79,70,186,0.12)] text-[var(--brand-primary)] border border-[rgba(79,70,186,0.2)]"
                    : "text-[var(--brand-muted)] hover:bg-[var(--surface-muted)]"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Snapshot Tab */}
        {activeTab === "snapshot" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[var(--border-soft)] p-6">
              <InvestorSnapshot
                monthlyMetrics={initialMonthlyMetrics}
                legacyMetrics={metrics ? {
                  mrr: metrics.mrr,
                  arr: metrics.arr,
                  burnRate: metrics.burnRate,
                  runwayMonths: metrics.runwayMonths,
                  ltvCac: metrics.ltvCac,
                  grossMargin: metrics.grossMargin,
                } : null}
              />
            </div>
          </div>
        )}

        {/* Traction Tab */}
        {activeTab === "traction" && upsertMonthlyMetricsFn && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[var(--border-soft)] p-6">
              <MonthlyMetricsTable
                modelId={modelId}
                rows={initialMonthlyMetrics}
                onSave={async (rows) => {
                  await upsertMonthlyMetricsFn({
                    modelId,
                    rows: rows.map((r) => ({
                        month: r.month,
                        mrr: r.mrr,
                        newMrr: r.newMrr,
                        expansionMrr: r.expansionMrr,
                        contractionMrr: r.contractionMrr,
                        churnedMrr: r.churnedMrr,
                        customers: r.customers,
                        newCustomers: r.newCustomers,
                        churnedCustomers: r.churnedCustomers,
                        gmv: r.gmv,
                        revenue: r.revenue,
                        grossProfit: r.grossProfit,
                        opex: r.opex,
                        cashBalance: r.cashBalance,
                        headcount: r.headcount,
                        marketingSpend: r.marketingSpend,
                      })),
                  });
                  await queryClient.invalidateQueries({ queryKey: ["model", modelId] });
                }}
                currency="USD"
              />
            </div>
          </div>
        )}

        {/* Cohorts Tab */}
        {activeTab === "cohorts" && upsertCohortsFn && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[var(--border-soft)] p-6">
              <CohortTable
                modelId={modelId}
                rows={initialCohorts}
                onSave={async (rows) => {
                  await upsertCohortsFn({
                    modelId,
                    cohorts: rows.map((r) => ({
                      cohortMonth: r.cohortMonth,
                      cohortSize: r.cohortSize,
                      retentionByMonth: r.retentionByMonth ?? [],
                      revenueByMonth: r.revenueByMonth ?? null,
                    })),
                  });
                  await queryClient.invalidateQueries({ queryKey: ["model", modelId] });
                }}
              />
            </div>
          </div>
        )}

        {/* Scenarios Tab */}
        {activeTab === "scenarios" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[var(--border-soft)] p-6">
              <h2 className="text-2xl font-bold text-[var(--brand-ink)] mb-2">
                Scenario parameters
              </h2>
              <p className="text-sm text-[var(--brand-muted)] mb-6">
                Model three scenarios to show investors you&apos;ve thought through different outcomes. Values are fractions (e.g. 0.25 = 25%).
              </p>

              {tractionSeed && (
                <div className="mb-6 rounded-xl bg-[rgba(79,70,186,0.06)] border border-[rgba(79,70,186,0.15)] p-4">
                  <p className="text-sm text-[var(--brand-primary)] font-medium">
                    Projections seeded from your traction data
                  </p>
                  <p className="text-xs text-[var(--brand-muted)] mt-1">
                    Starting with {tractionSeed.latestCustomers} customers, ${tractionSeed.latestArpu?.toFixed(0) ?? '—'}/mo ARPU from your latest monthly metrics.
                  </p>
                </div>
              )}

              <div className="flex gap-2 mb-6">
                {(["conservative", "base", "optimistic"] as ScenarioType[]).map(
                  (sc) => (
                    <button
                      key={sc}
                      onClick={() => setActiveScenarioTab(sc)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeScenarioTab === sc
                          ? "bg-[var(--brand-primary)] text-white"
                          : "bg-[var(--surface-muted)] text-[var(--brand-muted)] hover:bg-[var(--surface-muted-border)]"
                      }`}
                    >
                      {sc === "conservative"
                        ? "Conservative"
                        : sc === "base"
                          ? "Base"
                          : "Optimistic"}
                    </button>
                  )
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ScenarioField
                  label="Customer Growth"
                  tooltip={TOOLTIPS.userGrowth}
                  unit="% per year"
                  step={0.01}
                  min={0}
                  max={3}
                  value={scenarios.get(activeScenarioTab)?.userGrowth || 0}
                  onChange={(v) => updateScenarioField(activeScenarioTab, "userGrowth", v)}
                />
                <ScenarioField
                  label="ARPU"
                  tooltip={TOOLTIPS.arpu}
                  unit="$/month"
                  step={1}
                  min={0}
                  value={scenarios.get(activeScenarioTab)?.arpu || 0}
                  onChange={(v) => updateScenarioField(activeScenarioTab, "arpu", v)}
                />
                <ScenarioField
                  label="Monthly Churn Rate"
                  tooltip={TOOLTIPS.churnRate}
                  unit="% per month"
                  step={0.001}
                  min={0}
                  max={0.95}
                  value={scenarios.get(activeScenarioTab)?.churnRate || 0}
                  onChange={(v) => updateScenarioField(activeScenarioTab, "churnRate", v)}
                />
                <ScenarioField
                  label="CAC"
                  tooltip={TOOLTIPS.cac}
                  unit="$ per customer"
                  step={1}
                  min={0}
                  value={scenarios.get(activeScenarioTab)?.cac || 0}
                  onChange={(v) => updateScenarioField(activeScenarioTab, "cac", v)}
                />
                <ScenarioField
                  label="Expansion Rate"
                  tooltip={TOOLTIPS.expansionRate}
                  unit="% of subscription revenue"
                  step={0.01}
                  min={0}
                  max={1}
                  value={scenarios.get(activeScenarioTab)?.expansionRate || 0}
                  onChange={(v) => updateScenarioField(activeScenarioTab, "expansionRate", v)}
                />
                <ScenarioField
                  label="Gross Margin Target"
                  tooltip={TOOLTIPS.grossMargin}
                  unit="%"
                  step={0.01}
                  min={0}
                  max={0.99}
                  value={scenarios.get(activeScenarioTab)?.grossMarginTarget || 0.75}
                  onChange={(v) => updateScenarioField(activeScenarioTab, "grossMarginTarget", v)}
                />
              </div>

              <div className="mt-6">
                <button
                  onClick={() => handleSaveScenario(activeScenarioTab)}
                  disabled={savingScenario}
                  className="px-6 py-2 bg-[var(--brand-primary)] hover:bg-[#3F38A4] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingScenario ? "Saving..." : "Save scenario"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fundraising Tab */}
        {activeTab === "fundraising" && (
          <div className="bg-white rounded-xl border border-[var(--border-soft)] p-6">
            {updateFundraisingFn ? (
              <FundraisingPanel
                fundraising={initialFundraising ?? null}
                onSave={async (data) => {
                  await updateFundraisingFn(data);
                  await queryClient.invalidateQueries({ queryKey: ["model", modelId] });
                }}
                settings={settings}
                projections={projections}
                arr={
                  (() => {
                    const sorted = [...initialMonthlyMetrics].sort(
                      (a, b) => new Date(b.month).getTime() - new Date(a.month).getTime()
                    );
                    const latest = sorted[0];
                    if (latest?.mrr != null) return latest.mrr * 12;
                    if (metrics?.mrr != null) return metrics.mrr * 12;
                    return metrics?.arr ?? null;
                  })()
                }
              />
            ) : (
              <>
                <h2 className="text-2xl font-bold text-[var(--brand-ink)] mb-2">Fundraising</h2>
                <p className="text-sm text-[var(--brand-muted)]">
                  Round inputs and valuation (DCF + multiples). Save is not available.
                </p>
              </>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[var(--border-soft)] p-6">
              <h2 className="text-2xl font-bold text-[var(--brand-ink)] mb-2">
                Model settings
              </h2>
              <p className="text-sm text-[var(--brand-muted)] mb-6">
                Configure starting conditions, tax rates, and cost structure for your projections.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SettingsField label="Starting customers" value={settings.startUsers} onChange={(v) => updateSettingsField("startUsers", v)} min={0} step={1} />
                <SettingsField label="Tax rate" tooltip="Corporate tax rate applied to taxable income. Varies by jurisdiction." value={settings.taxRate} onChange={(v) => updateSettingsField("taxRate", v)} min={0} max={0.9} step={0.01} unit="fraction (0.12 = 12%)" />
                <SettingsField label="Discount rate (WACC)" tooltip={TOOLTIPS.discountRate} value={settings.discountRate} onChange={(v) => updateSettingsField("discountRate", v)} min={0.01} max={0.95} step={0.01} unit="fraction" />
                <SettingsField label="Terminal growth" tooltip={TOOLTIPS.terminalGrowth} value={settings.terminalGrowth} onChange={(v) => updateSettingsField("terminalGrowth", v)} min={0} max={0.2} step={0.01} unit="fraction" />
                <SettingsField label="Safety buffer ($)" tooltip={TOOLTIPS.safetyBuffer} value={settings.safetyBuffer} onChange={(v) => updateSettingsField("safetyBuffer", v)} min={0} step={1000} />
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">
                    Growth model
                    <span className="inline-flex text-[var(--brand-muted)] cursor-help ml-1" title={TOOLTIPS.scurveGrowth}>
                      <Info size={14} />
                    </span>
                  </label>
                  <select
                    value={settings.growthModel ?? 'linear'}
                    onChange={(e) => updateSettingsField("growthModel", e.target.value as 'linear' | 'scurve')}
                    className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                  >
                    <option value="linear">Compound (exponential)</option>
                    <option value="scurve">S-Curve (logistic)</option>
                  </select>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold text-[var(--brand-ink)] mb-2">
                  Cost structure
                </h3>
                <p className="text-xs text-[var(--brand-muted)] mb-4">
                  Customize your per-unit costs. These feed into COGS calculations in projections.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SettingsField
                    label="Hosting cost / user / month"
                    tooltip={TOOLTIPS.hostingCost}
                    value={settings.costStructure?.hostingCostPerUser ?? DEFAULT_COST_STRUCTURE.hostingCostPerUser}
                    onChange={(v) => updateSettingsField("costStructure", { ...(settings.costStructure ?? DEFAULT_COST_STRUCTURE), hostingCostPerUser: v })}
                    min={0} step={0.01} unit="$"
                  />
                  <SettingsField
                    label="Payment processing rate"
                    tooltip={TOOLTIPS.paymentProcessing}
                    value={settings.costStructure?.paymentProcessingRate ?? DEFAULT_COST_STRUCTURE.paymentProcessingRate}
                    onChange={(v) => updateSettingsField("costStructure", { ...(settings.costStructure ?? DEFAULT_COST_STRUCTURE), paymentProcessingRate: v })}
                    min={0} max={0.2} step={0.001} unit="fraction"
                  />
                  <SettingsField
                    label="Support cost / user / month"
                    tooltip={TOOLTIPS.supportCost}
                    value={settings.costStructure?.supportCostPerUser ?? DEFAULT_COST_STRUCTURE.supportCostPerUser}
                    onChange={(v) => updateSettingsField("costStructure", { ...(settings.costStructure ?? DEFAULT_COST_STRUCTURE), supportCostPerUser: v })}
                    min={0} step={0.01} unit="$"
                  />
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold text-[var(--brand-ink)] mb-4">
                  Values by year
                </h3>
                <div className="space-y-6">
                  <YearArrayField label="Personnel cost ($)" values={settings.personnelByYear} onChange={(arr) => updateSettingsField("personnelByYear", arr)} />
                  <YearArrayField label="Employees (headcount)" values={settings.employeesByYear} onChange={(arr) => updateSettingsField("employeesByYear", arr)} />
                  <YearArrayField label="R&D ($)" values={settings.costStructure?.rdByYear ?? DEFAULT_COST_STRUCTURE.rdByYear} onChange={(arr) => updateSettingsField("costStructure", { ...(settings.costStructure ?? DEFAULT_COST_STRUCTURE), rdByYear: arr })} />
                  <YearArrayField label="G&A ($)" values={settings.costStructure?.gnaByYear ?? DEFAULT_COST_STRUCTURE.gnaByYear} onChange={(arr) => updateSettingsField("costStructure", { ...(settings.costStructure ?? DEFAULT_COST_STRUCTURE), gnaByYear: arr })} />
                  <YearArrayField label="CAPEX ($)" values={settings.capexByYear} onChange={(arr) => updateSettingsField("capexByYear", arr)} />
                  <YearArrayField label="Depreciation ($)" values={settings.depreciationByYear} onChange={(arr) => updateSettingsField("depreciationByYear", arr)} />
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="px-6 py-2 bg-[var(--brand-primary)] hover:bg-[#3F38A4] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingSettings ? "Saving..." : "Save settings"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Market Tab */}
        {activeTab === "market" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[var(--border-soft)] p-6">
              <h2 className="text-2xl font-bold text-[var(--brand-ink)] mb-2">
                Market sizing
              </h2>
              <p className="text-sm text-[var(--brand-muted)] mb-6">
                Define your market opportunity. Investors want to see a large TAM with a credible path to capturing SAM/SOM.
              </p>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-[var(--brand-muted)] mb-2">
                      TAM ($)
                      <span className="inline-flex cursor-help" title={TOOLTIPS.tam}><Info size={14} /></span>
                    </label>
                    <input type="number" min="0" value={market.tam} onChange={(e) => updateMarketField("tam", parseInt(e.target.value) || 0)} className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">TAM description</label>
                    <input type="text" value={market.tamDescription ?? ''} onChange={(e) => updateMarketField("tamDescription", e.target.value)} placeholder="e.g. Global project management software market" className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-[var(--brand-muted)] mb-2">
                      SAM ($)
                      <span className="inline-flex cursor-help" title={TOOLTIPS.sam}><Info size={14} /></span>
                    </label>
                    <input type="number" min="0" value={market.sam} onChange={(e) => updateMarketField("sam", parseInt(e.target.value) || 0)} className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">SAM description</label>
                    <input type="text" value={market.samDescription ?? ''} onChange={(e) => updateMarketField("samDescription", e.target.value)} placeholder="e.g. SMB segment in North America" className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent" />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-[var(--brand-muted)] mb-2">
                    SOM by year ($)
                    <span className="inline-flex cursor-help" title={TOOLTIPS.som}><Info size={14} /></span>
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {market.som.map((value, index) => (
                      <div key={index}>
                        <label className="block text-xs text-[var(--brand-muted)] mb-1">Year {index + 1}</label>
                        <input type="number" min="0" value={value} onChange={(e) => { const newArray = [...market.som]; newArray[index] = parseInt(e.target.value) || 0; updateMarketField("som", newArray); }} className="w-full px-3 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent text-sm" />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">SOM description</label>
                  <input type="text" value={market.somDescription ?? ''} onChange={(e) => updateMarketField("somDescription", e.target.value)} placeholder="e.g. Realistic capture based on sales capacity and competition" className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent" />
                </div>
              </div>

              <div className="mt-6">
                <button onClick={handleSaveMarket} disabled={savingMarket} className="px-6 py-2 bg-[var(--brand-primary)] hover:bg-[#3F38A4] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {savingMarket ? "Saving..." : "Save market sizing"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Metrics Tab */}
        {activeTab === "metrics" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[var(--border-soft)] p-6">
              <h2 className="text-2xl font-bold text-[var(--brand-ink)] mb-2">
                Product & business metrics
              </h2>
              <p className="text-sm text-[var(--brand-muted)] mb-6">
                Enter the metrics you track—we&apos;ll help you present them to investors.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--brand-ink)] mb-1">
                    Growth & Traction
                  </h3>
                  <p className="text-xs text-[var(--brand-muted)] mb-3">
                    VCs look for growth rate and retention; focus on the last 3–6 months.
                  </p>
                  <div className="space-y-3">
                    <MetricInput
                      label="Users / Customers"
                      value={metrics.usersTotal}
                      onChange={(val) => updateMetricsField("usersTotal", val)}
                      placeholder="e.g. 5000"
                    />
                    <MetricInput
                      label="DAU"
                      value={metrics.dau}
                      onChange={(val) => updateMetricsField("dau", val)}
                      placeholder="e.g. 1200"
                    />
                    <MetricInput
                      label="MAU"
                      value={metrics.mau}
                      onChange={(val) => updateMetricsField("mau", val)}
                      placeholder="e.g. 8000"
                    />
                    <MetricInput
                      label="Growth rate (%)"
                      value={metrics.growthRate}
                      onChange={(val) => updateMetricsField("growthRate", val)}
                      unit="%"
                      placeholder="0.15 = 15%"
                    />
                    <MetricInput
                      label="Activation rate (%)"
                      value={metrics.activationRate}
                      onChange={(val) => updateMetricsField("activationRate", val)}
                      unit="%"
                      placeholder="0.25 = 25%"
                    />
                    <MetricInput
                      label="Retention rate (%)"
                      value={metrics.retentionRate}
                      onChange={(val) => updateMetricsField("retentionRate", val)}
                      unit="%"
                      placeholder="0.80 = 80%"
                    />
                    <MetricInput
                      label="Churn rate (%)"
                      value={metrics.churnRate}
                      onChange={(val) => updateMetricsField("churnRate", val)}
                      unit="%"
                      placeholder="0.05 = 5%"
                    />
                    <MetricDisplay
                      label="DAU / MAU Ratio"
                      value={derivedMetrics.dauMauRatio}
                      suffix="x"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[var(--brand-ink)] mb-1">
                    Revenue Metrics
                  </h3>
                  <p className="text-xs text-[var(--brand-muted)] mb-3">
                    MRR and ARR are table stakes for investors; show clear growth.
                  </p>
                  <div className="space-y-3">
                    <MetricInput
                      label="MRR"
                      value={metrics.mrr}
                      onChange={(val) => updateMetricsField("mrr", val)}
                      unit="$"
                      placeholder="e.g. 12000"
                      tooltip="Monthly Recurring Revenue"
                    />
                    <MetricDisplay
                      label="ARR (auto)"
                      value={derivedMetrics.arr}
                      unit="$"
                      tooltip="Annual Recurring Revenue (MRR × 12)"
                    />
                    <MetricInput
                      label="ARPU / ARPA"
                      value={metrics.arpu}
                      onChange={(val) => updateMetricsField("arpu", val)}
                      unit="$"
                      placeholder="e.g. 45"
                      tooltip="Average Revenue Per User / Account"
                    />
                    <MetricInput
                      label="Revenue growth rate (%)"
                      value={metrics.revenueGrowthRate}
                      onChange={(val) => updateMetricsField("revenueGrowthRate", val)}
                      unit="%"
                      placeholder="0.20 = 20%"
                    />
                    <MetricInput
                      label="Expansion revenue"
                      value={metrics.expansionRevenue}
                      onChange={(val) => updateMetricsField("expansionRevenue", val)}
                      unit="$"
                    />
                    <MetricInput
                      label="Contraction revenue"
                      value={metrics.contractionRevenue}
                      onChange={(val) => updateMetricsField("contractionRevenue", val)}
                      unit="$"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[var(--brand-ink)] mb-1">
                    Customer Economics
                  </h3>
                  <p className="text-xs text-[var(--brand-muted)] mb-3">
                    LTV/CAC and payback period show unit economics; VCs expect LTV/CAC &gt; 3.
                  </p>
                  <div className="space-y-3">
                    <MetricInput
                      label="CAC"
                      value={metrics.cac}
                      onChange={(val) => updateMetricsField("cac", val)}
                      unit="$"
                      placeholder="e.g. 150"
                      tooltip="Customer Acquisition Cost"
                    />
                    <MetricInput
                      label="LTV"
                      value={metrics.ltv}
                      onChange={(val) => updateMetricsField("ltv", val)}
                      unit="$"
                      placeholder="e.g. 600"
                      tooltip="Lifetime Value"
                    />
                    <MetricDisplay
                      label="LTV / CAC (auto)"
                      value={derivedMetrics.ltvCac}
                      suffix="x"
                      tooltip="Lifetime Value divided by CAC; target &gt; 3x"
                    />
                    <MetricInput
                      label="Payback period (months)"
                      value={metrics.paybackPeriodMonths}
                      onChange={(val) => updateMetricsField("paybackPeriodMonths", val)}
                      placeholder="e.g. 12"
                      tooltip="Months to recover CAC from revenue"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[var(--brand-ink)] mb-1">
                    Marketing & Sales
                  </h3>
                  <p className="text-xs text-[var(--brand-muted)] mb-3">
                    Conversion and win rate help VCs assess go-to-market efficiency.
                  </p>
                  <div className="space-y-3">
                    <MetricInput
                      label="Conversion rate (%)"
                      value={metrics.conversionRate}
                      onChange={(val) => updateMetricsField("conversionRate", val)}
                      unit="%"
                      placeholder="0.03 = 3%"
                    />
                    <MetricInput
                      label="Cost per lead (CPL)"
                      value={metrics.cpl}
                      onChange={(val) => updateMetricsField("cpl", val)}
                      unit="$"
                    />
                    <MetricInput
                      label="Sales cycle length (days)"
                      value={metrics.salesCycleLengthDays}
                      onChange={(val) => updateMetricsField("salesCycleLengthDays", val)}
                      placeholder="e.g. 45"
                    />
                    <MetricInput
                      label="Win rate (%)"
                      value={metrics.winRate}
                      onChange={(val) => updateMetricsField("winRate", val)}
                      unit="%"
                      placeholder="0.25 = 25%"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[var(--brand-ink)] mb-1">
                    Product Metrics
                  </h3>
                  <p className="text-xs text-[var(--brand-muted)] mb-3">
                    Engagement and NPS signal product-market fit.
                  </p>
                  <div className="space-y-3">
                    <MetricInput
                      label="Feature adoption rate (%)"
                      value={metrics.featureAdoptionRate}
                      onChange={(val) => updateMetricsField("featureAdoptionRate", val)}
                      unit="%"
                      placeholder="0.40 = 40%"
                    />
                    <MetricInput
                      label="Time to value (days)"
                      value={metrics.timeToValueDays}
                      onChange={(val) => updateMetricsField("timeToValueDays", val)}
                      placeholder="e.g. 7"
                    />
                    <MetricInput
                      label="NPS"
                      value={metrics.nps}
                      onChange={(val) => updateMetricsField("nps", val)}
                      placeholder="e.g. 50"
                      tooltip="Net Promoter Score (-100 to 100)"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[var(--brand-ink)] mb-1">
                    Financial Health
                  </h3>
                  <p className="text-xs text-[var(--brand-muted)] mb-3">
                    Burn and runway are critical for fundraising timing.
                  </p>
                  <div className="space-y-3">
                    <MetricInput
                      label="Burn rate"
                      value={metrics.burnRate}
                      onChange={(val) => updateMetricsField("burnRate", val)}
                      unit="$"
                      placeholder="e.g. 50000"
                    />
                    <MetricInput
                      label="Runway (months)"
                      value={metrics.runwayMonths}
                      onChange={(val) => updateMetricsField("runwayMonths", val)}
                      placeholder="e.g. 18"
                    />
                    <MetricInput
                      label="Gross margin (%)"
                      value={metrics.grossMargin}
                      onChange={(val) => updateMetricsField("grossMargin", val)}
                      unit="%"
                      placeholder="0.70 = 70%"
                    />
                    <MetricInput
                      label="Operating margin (%)"
                      value={metrics.operatingMargin}
                      onChange={(val) => updateMetricsField("operatingMargin", val)}
                      unit="%"
                      placeholder="0.10 = 10%"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleSaveMetrics}
                  disabled={savingMetrics}
                  className="px-6 py-2 bg-[var(--brand-primary)] hover:bg-[#3F38A4] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingMetrics ? "Saving..." : "Save metrics"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === "results" && (
          <div>
            {projections.length > 0 && (
              <FinancialModel
                scenario={scenario}
                onScenarioChange={setScenario}
                projections={projections}
                marketSizing={market}
                settings={settings}
                scenarioParams={currentScenarioParams}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ScenarioField({
  label,
  tooltip,
  unit,
  step,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  tooltip: string;
  unit: string;
  step: number;
  min: number;
  max?: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-[var(--brand-muted)] mb-2">
        {label}
        <span className="inline-flex text-[var(--brand-muted)] cursor-help" title={tooltip}>
          <Info size={14} />
        </span>
      </label>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
      />
      <p className="text-xs text-[var(--brand-muted)] mt-1">{unit}</p>
    </div>
  );
}

function SettingsField({
  label,
  tooltip,
  value,
  onChange,
  min,
  max,
  step,
  unit,
}: {
  label: string;
  tooltip?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-[var(--brand-muted)] mb-2">
        {label}
        {tooltip && (
          <span className="inline-flex text-[var(--brand-muted)] cursor-help" title={tooltip}>
            <Info size={14} />
          </span>
        )}
      </label>
      <input
        type="number"
        step={step ?? 1}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
      />
      {unit && <p className="text-xs text-[var(--brand-muted)] mt-1">{unit}</p>}
    </div>
  );
}

function YearArrayField({
  label,
  values,
  onChange,
}: {
  label: string;
  values: number[];
  onChange: (values: number[]) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">{label}</label>
      <div className="grid grid-cols-5 gap-2">
        {values.map((value, index) => (
          <div key={index}>
            <label className="block text-xs text-[var(--brand-muted)] mb-1">Year {index + 1}</label>
            <input
              type="number"
              min="0"
              value={value}
              onChange={(e) => {
                const newArray = [...values];
                newArray[index] = parseInt(e.target.value) || 0;
                onChange(newArray);
              }}
              className="w-full px-3 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricInput({
  label,
  value,
  onChange,
  unit,
  placeholder,
  tooltip,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  unit?: string;
  placeholder?: string;
  tooltip?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-soft)] px-4 py-2">
      <div className="flex items-center gap-1.5">
        <p className="text-sm text-[var(--brand-muted)]">{label}</p>
        {tooltip && (
          <span className="inline-flex text-[var(--brand-muted)] cursor-help" title={tooltip}>
            <Info size={14} />
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {unit && (
          <span className="text-xs text-[var(--brand-muted)]">{unit}</span>
        )}
        <input
          type="number"
          step="0.01"
          value={value ?? ""}
          onChange={(e) => {
            const next = e.target.value === "" ? null : parseFloat(e.target.value);
            onChange(Number.isNaN(next as number) ? null : next);
          }}
          placeholder={placeholder}
          className="w-28 text-right px-3 py-1.5 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent text-sm"
        />
      </div>
    </div>
  );
}

function MetricDisplay({
  label,
  value,
  unit,
  suffix,
  tooltip,
}: {
  label: string;
  value: number | null | undefined;
  unit?: string;
  suffix?: string;
  tooltip?: string;
}) {
  const display =
    value == null || Number.isNaN(value)
      ? "—"
      : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
          value
        );
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-[var(--surface-muted)] px-4 py-2">
      <span className="flex items-center gap-1.5 text-sm text-[var(--brand-muted)]">
        {label}
        {tooltip && (
          <span className="inline-flex cursor-help" title={tooltip}>
            <Info size={14} />
          </span>
        )}
      </span>
      <span className="text-sm font-semibold text-[var(--brand-ink)]">
        {unit && <span className="text-xs text-[var(--brand-muted)]">{unit} </span>}
        {display}
        {suffix && <span className="text-xs text-[var(--brand-muted)]"> {suffix}</span>}
      </span>
    </div>
  );
}
