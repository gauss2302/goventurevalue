import { useState, useEffect, useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import { Info } from "lucide-react";
import type { ScenarioType, UpdateScenarioDto, UpdateSettingsDto, MarketSizingDto, UpdateMetricsDto } from "@/lib/dto";
import type { ModelSettings, MarketSizing, ScenarioParams } from "@/lib/calculations";
import { calculateProjections } from "@/lib/calculations";
import FinancialModel from "./FinancialModel";

type FinancialModelEditorProps = {
  modelId: number;
  initialScenarios: Array<{
    scenarioType: ScenarioType;
    userGrowth: string;
    arpu: string;
    churnRate: string;
    farmerGrowth: string;
    cac: string;
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
  initialMetrics: ModelMetrics | null;
};

type EditorTab = "scenarios" | "settings" | "market" | "metrics" | "results";

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
  updateScenarioFn,
  updateSettingsFn,
  updateMarketSizingFn,
  updateMetricsFn,
}: FinancialModelEditorProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<EditorTab>("scenarios");
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
        farmerGrowth: normalizeRateInput(parseFloat(s.farmerGrowth), -0.95, 3),
        cac: Number.isFinite(cac) ? cac : 0,
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

  // Recalculate projections when any input changes
  useEffect(() => {
    const currentScenarioParams = scenarios.get(scenario) || {
      userGrowth: 0.25,
      arpu: 4.0,
      churnRate: 0.05,
      farmerGrowth: 0.2,
      cac: 18,
    };
    const proj = calculateProjections(currentScenarioParams, settings, market);
    setProjections(proj);
  }, [scenario, scenarios, settings, market]);

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
          await router.invalidate();
        } catch (invalidateError) {
          console.warn("Scenario saved, but failed to refresh data:", invalidateError);
        }
      } catch (error) {
        console.error("Failed to save scenario:", error);
        const message =
          (error as any)?.message ||
          (error as any)?.data?.message ||
          "Failed to save scenario. Please try again.";
        alert(message);
      } finally {
        setSavingScenario(false);
      }
    },
    [modelId, scenarios, updateScenarioFn, router]
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
        await router.invalidate();
      } catch (invalidateError) {
        console.warn("Settings saved, but failed to refresh data:", invalidateError);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      const message =
        (error as any)?.message ||
        (error as any)?.data?.message ||
        "Failed to save settings. Please try again.";
      alert(message);
    } finally {
      setSavingSettings(false);
    }
  }, [modelId, settings, updateSettingsFn, router]);

  // Save market sizing
  const handleSaveMarket = useCallback(async () => {
    setSavingMarket(true);
    try {
      await updateMarketSizingFn({
        modelId,
        data: market,
      });
      try {
        await router.invalidate();
      } catch (invalidateError) {
        console.warn("Market sizing saved, but failed to refresh data:", invalidateError);
      }
    } catch (error) {
      console.error("Failed to save market sizing:", error);
      const message =
        (error as any)?.message ||
        (error as any)?.data?.message ||
        "Failed to save market sizing. Please try again.";
      alert(message);
    } finally {
      setSavingMarket(false);
    }
  }, [modelId, market, updateMarketSizingFn, router]);

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
        await router.invalidate();
      } catch (invalidateError) {
        console.warn("Metrics saved, but failed to refresh data:", invalidateError);
      }
    } catch (error) {
      console.error("Failed to save metrics:", error);
      const message =
        (error as any)?.message ||
        (error as any)?.data?.message ||
        "Failed to save metrics. Please try again.";
      alert(message);
    } finally {
      setSavingMetrics(false);
    }
  }, [modelId, metrics, derivedMetrics, updateMetricsFn, router]);

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
          arpu: 4.0,
          churnRate: 0.05,
          farmerGrowth: 0.2,
          cac: 18,
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
    arpu: 4.0,
    churnRate: 0.05,
    farmerGrowth: 0.2,
    cac: 18,
  };

  const tabs = [
    { id: "scenarios" as EditorTab, label: "Scenarios", icon: "📊" },
    { id: "settings" as EditorTab, label: "Settings", icon: "⚙️" },
    { id: "market" as EditorTab, label: "Market", icon: "🎯" },
    { id: "metrics" as EditorTab, label: "Metrics", icon: "📌" },
    { id: "results" as EditorTab, label: "Results", icon: "📈" },
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
        {/* Scenarios Tab */}
        {activeTab === "scenarios" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[var(--border-soft)] p-6">
              <h2 className="text-2xl font-bold text-[var(--brand-ink)] mb-6">
                Scenario parameters
              </h2>

              {/* Scenario Type Tabs */}
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

              {/* Scenario Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">
                    User Growth (% per year)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={scenarios.get(activeScenarioTab)?.userGrowth || 0}
                    onChange={(e) =>
                      updateScenarioField(
                        activeScenarioTab,
                        "userGrowth",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">
                    ARPU ($/month)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={scenarios.get(activeScenarioTab)?.arpu || 0}
                    onChange={(e) =>
                      updateScenarioField(
                        activeScenarioTab,
                        "arpu",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">
                    Churn Rate (% per month)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max="1"
                    value={scenarios.get(activeScenarioTab)?.churnRate || 0}
                    onChange={(e) =>
                      updateScenarioField(
                        activeScenarioTab,
                        "churnRate",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">
                    Farmer Growth (% per year)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={scenarios.get(activeScenarioTab)?.farmerGrowth || 0}
                    onChange={(e) =>
                      updateScenarioField(
                        activeScenarioTab,
                        "farmerGrowth",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">
                    CAC ($ per user)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={scenarios.get(activeScenarioTab)?.cac || 0}
                    onChange={(e) =>
                      updateScenarioField(
                        activeScenarioTab,
                        "cac",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                  />
                </div>
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

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[var(--border-soft)] p-6">
              <h2 className="text-2xl font-bold text-[var(--brand-ink)] mb-6">
                Model settings
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">
                    Starting users
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.startUsers}
                    onChange={(e) =>
                      updateSettingsField("startUsers", parseInt(e.target.value) || 0)
                    }
                    className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">
                    Starting farmers
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.startFarmers}
                    onChange={(e) =>
                      updateSettingsField(
                        "startFarmers",
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">
                    Tax rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={settings.taxRate}
                    onChange={(e) =>
                      updateSettingsField("taxRate", parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">
                    Discount rate (WACC %)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={settings.discountRate}
                    onChange={(e) =>
                      updateSettingsField(
                        "discountRate",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">
                    Terminal growth (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={settings.terminalGrowth}
                    onChange={(e) =>
                      updateSettingsField(
                        "terminalGrowth",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">
                    Safety buffer ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.safetyBuffer}
                    onChange={(e) =>
                      updateSettingsField(
                        "safetyBuffer",
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Arrays by Year */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-[var(--brand-ink)] mb-4">
                  Values by year
                </h3>

                <div className="space-y-6">
                  {/* Personnel by Year */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">
                      Personnel by year ($)
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {settings.personnelByYear.map((value, index) => (
                        <div key={index}>
                          <label className="block text-xs text-[var(--brand-muted)] mb-1">
                            Year {index + 1}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={value}
                            onChange={(e) => {
                              const newArray = [...settings.personnelByYear];
                              newArray[index] = parseInt(e.target.value) || 0;
                              updateSettingsField("personnelByYear", newArray);
                            }}
                            className="w-full px-3 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Employees by Year */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">
                      Employees by year
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {settings.employeesByYear.map((value, index) => (
                        <div key={index}>
                          <label className="block text-xs text-[var(--brand-muted)] mb-1">
                            Year {index + 1}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={value}
                            onChange={(e) => {
                              const newArray = [...settings.employeesByYear];
                              newArray[index] = parseInt(e.target.value) || 0;
                              updateSettingsField("employeesByYear", newArray);
                            }}
                            className="w-full px-3 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CAPEX by Year */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">
                      CAPEX by year ($)
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {settings.capexByYear.map((value, index) => (
                        <div key={index}>
                          <label className="block text-xs text-[var(--brand-muted)] mb-1">
                            Year {index + 1}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={value}
                            onChange={(e) => {
                              const newArray = [...settings.capexByYear];
                              newArray[index] = parseInt(e.target.value) || 0;
                              updateSettingsField("capexByYear", newArray);
                            }}
                            className="w-full px-3 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Depreciation by Year */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">
                      Depreciation by year ($)
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {settings.depreciationByYear.map((value, index) => (
                        <div key={index}>
                          <label className="block text-xs text-[var(--brand-muted)] mb-1">
                            Year {index + 1}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={value}
                            onChange={(e) => {
                              const newArray = [...settings.depreciationByYear];
                              newArray[index] = parseInt(e.target.value) || 0;
                              updateSettingsField("depreciationByYear", newArray);
                            }}
                            className="w-full px-3 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
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
              <h2 className="text-2xl font-bold text-[var(--brand-ink)] mb-6">
                Market sizing
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">
                    TAM - Total Available Market ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={market.tam}
                    onChange={(e) =>
                      updateMarketField("tam", parseInt(e.target.value) || 0)
                    }
                    className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">
                    SAM - Serviceable Available Market ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={market.sam}
                    onChange={(e) =>
                      updateMarketField("sam", parseInt(e.target.value) || 0)
                    }
                    className="w-full px-4 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">
                  SOM – Serviceable Obtainable Market by year ($)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {market.som.map((value, index) => (
                    <div key={index}>
                      <label className="block text-xs text-[var(--brand-muted)] mb-1">
                        Year {index + 1}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={value}
                        onChange={(e) => {
                          const newArray = [...market.som];
                          newArray[index] = parseInt(e.target.value) || 0;
                          updateMarketField("som", newArray);
                        }}
                        className="w-full px-3 py-2 border border-[var(--border-soft)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleSaveMarket}
                  disabled={savingMarket}
                  className="px-6 py-2 bg-[var(--brand-primary)] hover:bg-[#3F38A4] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
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
            {/* Scenario Selector */}
            <div className="bg-white rounded-xl border border-[var(--border-soft)] p-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[var(--brand-muted)]">
                  Scenario:
                </span>
                <div className="flex gap-1 bg-[var(--surface-muted)] p-1 rounded-lg">
                  {(["conservative", "base", "optimistic"] as ScenarioType[]).map(
                    (sc) => (
                      <button
                        key={sc}
                        onClick={() => setScenario(sc)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                          scenario === sc
                            ? "bg-[var(--brand-primary)] text-white shadow-sm"
                            : "text-[var(--brand-muted)] hover:text-[var(--brand-ink)] hover:bg-[var(--surface-muted-border)]"
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
              </div>
            </div>

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
