import { useState, useEffect, useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import type { ScenarioType, UpdateScenarioDto, UpdateSettingsDto, MarketSizingDto } from "@/lib/dto";
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
};

type EditorTab = "scenarios" | "settings" | "market" | "results";

export default function FinancialModelEditor({
  modelId,
  initialScenarios,
  initialSettings,
  initialMarket,
  updateScenarioFn,
  updateSettingsFn,
  updateMarketSizingFn,
}: FinancialModelEditorProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<EditorTab>("scenarios");
  const [activeScenarioTab, setActiveScenarioTab] = useState<ScenarioType>("base");
  const [scenario, setScenario] = useState<ScenarioType>("base");

  // Local state for editing
  const [scenarios, setScenarios] = useState(() => {
    const map = new Map<ScenarioType, ScenarioParams>();
    initialScenarios.forEach((s) => {
      map.set(s.scenarioType, {
        userGrowth: parseFloat(s.userGrowth),
        arpu: parseFloat(s.arpu),
        churnRate: parseFloat(s.churnRate),
        farmerGrowth: parseFloat(s.farmerGrowth),
        cac: parseFloat(s.cac),
      });
    });
    return map;
  });

  const [settings, setSettings] = useState<ModelSettings>(initialSettings);
  const [market, setMarket] = useState<MarketSizing>(initialMarket);
  const [projections, setProjections] = useState<any[]>([]);

  // Loading states
  const [savingScenario, setSavingScenario] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingMarket, setSavingMarket] = useState(false);

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
    { id: "scenarios" as EditorTab, label: "Сценарии", icon: "📊" },
    { id: "settings" as EditorTab, label: "Настройки", icon: "⚙️" },
    { id: "market" as EditorTab, label: "Рынок", icon: "🎯" },
    { id: "results" as EditorTab, label: "Результаты", icon: "📈" },
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
                    : "text-[var(--brand-muted)] hover:bg-[#F6F6FC]"
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
                Параметры сценариев
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
                          : "bg-[#F6F6FC] text-[var(--brand-muted)] hover:bg-[#EDEDF7]"
                      }`}
                    >
                      {sc === "conservative"
                        ? "Консервативный"
                        : sc === "base"
                          ? "Базовый"
                          : "Оптимистичный"}
                    </button>
                  )
                )}
              </div>

              {/* Scenario Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">
                    User Growth (% в год)
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
                    ARPU ($/месяц)
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
                    Churn Rate (% в месяц)
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
                    Farmer Growth (% в год)
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
                    CAC ($ на пользователя)
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
                  {savingScenario ? "Сохранение..." : "Сохранить сценарий"}
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
                Настройки модели
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">
                    Начальное количество пользователей
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
                    Начальное количество фермеров
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
                    Налоговая ставка (%)
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
                    Ставка дисконтирования (WACC %)
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
                    Терминальный рост (%)
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
                    Буфер безопасности ($)
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
                  Значения по годам
                </h3>

                <div className="space-y-6">
                  {/* Personnel by Year */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--brand-muted)] mb-2">
                      Персонал по годам ($)
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {settings.personnelByYear.map((value, index) => (
                        <div key={index}>
                          <label className="block text-xs text-[var(--brand-muted)] mb-1">
                            Год {index + 1}
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
                      Количество сотрудников по годам
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {settings.employeesByYear.map((value, index) => (
                        <div key={index}>
                          <label className="block text-xs text-[var(--brand-muted)] mb-1">
                            Год {index + 1}
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
                      CAPEX по годам ($)
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {settings.capexByYear.map((value, index) => (
                        <div key={index}>
                          <label className="block text-xs text-[var(--brand-muted)] mb-1">
                            Год {index + 1}
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
                      Амортизация по годам ($)
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {settings.depreciationByYear.map((value, index) => (
                        <div key={index}>
                          <label className="block text-xs text-[var(--brand-muted)] mb-1">
                            Год {index + 1}
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
                  {savingSettings ? "Сохранение..." : "Сохранить настройки"}
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
                Размер рынка
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
                  SOM - Serviceable Obtainable Market по годам ($)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {market.som.map((value, index) => (
                    <div key={index}>
                      <label className="block text-xs text-[var(--brand-muted)] mb-1">
                        Год {index + 1}
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
                  {savingMarket ? "Сохранение..." : "Сохранить размер рынка"}
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
                  Сценарий:
                </span>
                <div className="flex gap-1 bg-[#F6F6FC] p-1 rounded-lg">
                  {(["conservative", "base", "optimistic"] as ScenarioType[]).map(
                    (sc) => (
                      <button
                        key={sc}
                        onClick={() => setScenario(sc)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                          scenario === sc
                            ? "bg-[var(--brand-primary)] text-white shadow-sm"
                            : "text-[var(--brand-muted)] hover:text-[var(--brand-ink)] hover:bg-[#EDEDF7]"
                        }`}
                      >
                        {sc === "conservative"
                          ? "Консервативный"
                          : sc === "base"
                            ? "Базовый"
                            : "Оптимистичный"}
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
