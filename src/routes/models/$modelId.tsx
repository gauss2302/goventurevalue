import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "@/db/index";
import {
  financialModels,
  modelScenarios,
  marketSizing,
  modelSettings,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import {
  calculateProjections,
  DEFAULT_SETTINGS,
  DEFAULT_MARKET_SIZING,
} from "@/lib/calculations";
import FinancialModel from "@/components/FinancialModel";
import type { ScenarioType } from "@/lib/dto";
import type {
  ProjectionData,
  ModelSettings,
  MarketSizing,
} from "@/lib/calculations";

type LoaderData = {
  model: {
    id: number;
    name: string;
    companyName: string | null;
    description: string | null;
    currency: string;
  };
  scenarios: Array<{
    scenarioType: "conservative" | "base" | "optimistic";
    userGrowth: string;
    arpu: string;
    churnRate: string;
    farmerGrowth: string;
    cac: string;
  }>;
  market: MarketSizing | null;
  settings: ModelSettings | null;
};

export const Route = createFileRoute("/models/$modelId")({
  component: ModelDetail,
  // @ts-expect-error - Types will be correct after router regeneration
  loader: async ({ params, request }) => {
    const headers = request?.headers || new Headers();
    const session = await auth.api.getSession({
      headers: headers as Headers,
    });

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const modelId = parseInt((params as { modelId: string }).modelId);
    const model = await db.query.financialModels.findFirst({
      where: and(
        eq(financialModels.id, modelId),
        eq(financialModels.userId, session.user.id)
      ),
    });

    if (!model) {
      throw new Error("Model not found");
    }

    const scenariosData = await db.query.modelScenarios.findMany({
      where: eq(modelScenarios.modelId, modelId),
    });

    const marketData = await db.query.marketSizing.findFirst({
      where: eq(marketSizing.modelId, modelId),
    });

    const settingsData = await db.query.modelSettings.findFirst({
      where: eq(modelSettings.modelId, modelId),
    });

    return {
      model: {
        id: model.id,
        name: model.name,
        companyName: model.companyName,
        description: model.description,
        currency: model.currency,
      },
      scenarios: scenariosData.map((s) => ({
        scenarioType: s.scenarioType,
        userGrowth: s.userGrowth,
        arpu: s.arpu,
        churnRate: s.churnRate,
        farmerGrowth: s.farmerGrowth,
        cac: s.cac,
      })),
      market: marketData
        ? {
            tam: marketData.tam,
            sam: marketData.sam,
            som: marketData.som,
          }
        : null,
      settings: settingsData
        ? {
            startUsers: settingsData.startUsers,
            startFarmers: settingsData.startFarmers,
            taxRate: parseFloat(settingsData.taxRate),
            discountRate: parseFloat(settingsData.discountRate),
            terminalGrowth: parseFloat(settingsData.terminalGrowth),
            safetyBuffer: settingsData.safetyBuffer,
            personnelByYear: settingsData.personnelByYear,
            employeesByYear: settingsData.employeesByYear,
            capexByYear: settingsData.capexByYear,
            depreciationByYear: settingsData.depreciationByYear,
            projectionYears: settingsData.projectionYears,
          }
        : null,
    } satisfies LoaderData;
  },
});

function ModelDetail() {
  const data = Route.useLoaderData();
  const { model, scenarios, market, settings: loadedSettings } = data;
  const router = useRouter();
  const [scenario, setScenario] = useState<ScenarioType>("base");
  const [projections, setProjections] = useState<ProjectionData[]>([]);

  const settings = useMemo(
    () => loadedSettings || DEFAULT_SETTINGS,
    [loadedSettings]
  );
  const marketSizingData = useMemo(
    () => market || DEFAULT_MARKET_SIZING,
    [market]
  );

  // Get scenario params from loaded data
  const getScenarioParams = useCallback(
    (scenarioType: ScenarioType) => {
      const scenarioData = scenarios.find(
        (s: { scenarioType: ScenarioType }) => s.scenarioType === scenarioType
      );
      if (scenarioData) {
        return {
          userGrowth: parseFloat(scenarioData.userGrowth),
          arpu: parseFloat(scenarioData.arpu),
          churnRate: parseFloat(scenarioData.churnRate),
          farmerGrowth: parseFloat(scenarioData.farmerGrowth),
          cac: parseFloat(scenarioData.cac),
        };
      }
      // Default scenario params
      const defaults = {
        conservative: {
          userGrowth: 0.15,
          arpu: 2.5,
          churnRate: 0.08,
          farmerGrowth: 0.1,
          cac: 12,
        },
        base: {
          userGrowth: 0.25,
          arpu: 4.0,
          churnRate: 0.05,
          farmerGrowth: 0.2,
          cac: 18,
        },
        optimistic: {
          userGrowth: 0.4,
          arpu: 6.0,
          churnRate: 0.03,
          farmerGrowth: 0.35,
          cac: 24,
        },
      };
      return defaults[scenarioType];
    },
    [scenarios]
  );

  // Calculate projections when scenario changes
  useEffect(() => {
    const scenarioParams = getScenarioParams(scenario);
    const proj = calculateProjections(
      scenarioParams,
      settings,
      marketSizingData
    );
    setProjections(proj);
  }, [scenario, getScenarioParams, settings, marketSizingData]);

  const handleScenarioChange = useCallback((newScenario: ScenarioType) => {
    setScenario(newScenario);
  }, []);

  const currentScenarioParams = useMemo(
    () => getScenarioParams(scenario),
    [getScenarioParams, scenario]
  );

  if (projections.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading financial model...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div>
          <button
            onClick={() => router.navigate({ to: "/" })}
            className="text-emerald-600 hover:text-emerald-800 text-sm font-medium flex items-center gap-1 mb-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Models
          </button>
          <h2 className="text-2xl font-bold text-gray-900">{model.name}</h2>
          {model.companyName && (
            <p className="text-sm text-gray-600 mt-1">{model.companyName}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Currency: {model.currency}
          </span>
        </div>
      </div>
      <FinancialModel
        scenario={scenario}
        onScenarioChange={handleScenarioChange}
        projections={projections}
        marketSizing={marketSizingData}
        settings={settings}
        scenarioParams={currentScenarioParams}
      />
    </div>
  );
}
