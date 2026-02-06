import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { DEFAULT_SETTINGS, DEFAULT_MARKET_SIZING } from "@/lib/calculations";
import FinancialModelEditor from "@/components/FinancialModelEditor";
import { Sidebar } from "@/components/Sidebar";
import type {
  ScenarioType,
  UpdateScenarioDto,
  UpdateSettingsDto,
  MarketSizingDto,
  UpdateMetricsDto,
} from "@/lib/dto";
import type { ModelSettings, MarketSizing } from "@/lib/calculations";

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
  metrics: ModelMetrics | null;
};

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

const loadModelDetail = createServerFn({ method: "GET" })
  .inputValidator((data: { modelId: number }) => data)
  .handler(async ({ data }) => {
    const [
      { getRequestHeaders },
      { requireAuthFromHeaders },
      { db },
      schema,
      { eq, and },
    ] = await Promise.all([
      import("@tanstack/react-start/server"),
      import("@/lib/auth/requireAuth"),
      import("@/db/index"),
      import("@/db/schema"),
      import("drizzle-orm"),
    ]);

    const { financialModels, modelScenarios, marketSizing, modelSettings } =
      schema;
    const { modelMetrics } = schema;

    const headers = getRequestHeaders();
    const session = await requireAuthFromHeaders(headers);

    const model = await db.query.financialModels.findFirst({
      where: and(
        eq(financialModels.id, data.modelId),
        eq(financialModels.userId, session.user.id)
      ),
    });

    if (!model) {
      throw new Error("Model not found");
    }

    const scenariosData = await db.query.modelScenarios.findMany({
      where: eq(modelScenarios.modelId, data.modelId),
    });

    const marketData = await db.query.marketSizing.findFirst({
      where: eq(marketSizing.modelId, data.modelId),
    });

    const settingsData = await db.query.modelSettings.findFirst({
      where: eq(modelSettings.modelId, data.modelId),
    });

    const metricsData = await db.query.modelMetrics.findFirst({
      where: eq(modelMetrics.modelId, data.modelId),
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
      metrics: metricsData
        ? {
            usersTotal: metricsData.usersTotal ? Number(metricsData.usersTotal) : null,
            dau: metricsData.dau ? Number(metricsData.dau) : null,
            mau: metricsData.mau ? Number(metricsData.mau) : null,
            growthRate: metricsData.growthRate ? Number(metricsData.growthRate) : null,
            activationRate: metricsData.activationRate ? Number(metricsData.activationRate) : null,
            retentionRate: metricsData.retentionRate ? Number(metricsData.retentionRate) : null,
            churnRate: metricsData.churnRate ? Number(metricsData.churnRate) : null,
            mrr: metricsData.mrr ? Number(metricsData.mrr) : null,
            arr: metricsData.arr ? Number(metricsData.arr) : null,
            arpu: metricsData.arpu ? Number(metricsData.arpu) : null,
            revenueGrowthRate: metricsData.revenueGrowthRate ? Number(metricsData.revenueGrowthRate) : null,
            expansionRevenue: metricsData.expansionRevenue ? Number(metricsData.expansionRevenue) : null,
            contractionRevenue: metricsData.contractionRevenue ? Number(metricsData.contractionRevenue) : null,
            cac: metricsData.cac ? Number(metricsData.cac) : null,
            ltv: metricsData.ltv ? Number(metricsData.ltv) : null,
            ltvCac: metricsData.ltvCac ? Number(metricsData.ltvCac) : null,
            paybackPeriodMonths: metricsData.paybackPeriodMonths ? Number(metricsData.paybackPeriodMonths) : null,
            conversionRate: metricsData.conversionRate ? Number(metricsData.conversionRate) : null,
            cpl: metricsData.cpl ? Number(metricsData.cpl) : null,
            salesCycleLengthDays: metricsData.salesCycleLengthDays ? Number(metricsData.salesCycleLengthDays) : null,
            winRate: metricsData.winRate ? Number(metricsData.winRate) : null,
            dauMauRatio: metricsData.dauMauRatio ? Number(metricsData.dauMauRatio) : null,
            featureAdoptionRate: metricsData.featureAdoptionRate ? Number(metricsData.featureAdoptionRate) : null,
            timeToValueDays: metricsData.timeToValueDays ? Number(metricsData.timeToValueDays) : null,
            nps: metricsData.nps ? Number(metricsData.nps) : null,
            burnRate: metricsData.burnRate ? Number(metricsData.burnRate) : null,
            runwayMonths: metricsData.runwayMonths ? Number(metricsData.runwayMonths) : null,
            grossMargin: metricsData.grossMargin ? Number(metricsData.grossMargin) : null,
            operatingMargin: metricsData.operatingMargin ? Number(metricsData.operatingMargin) : null,
          }
        : null,
    } satisfies LoaderData;
  });

// Server functions for updating model data
const updateScenario = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      modelId: number;
      scenarioType: ScenarioType;
      data: UpdateScenarioDto;
    }) => data
  )
  .handler(async ({ data }) => {
    const [
      { getRequestHeaders },
      { requireAuthFromHeaders },
      { db },
      schema,
      { eq, and },
    ] = await Promise.all([
      import("@tanstack/react-start/server"),
      import("@/lib/auth/requireAuth"),
      import("@/db/index"),
      import("@/db/schema"),
      import("drizzle-orm"),
    ]);

    const { financialModels, modelScenarios } = schema;

    const headers = getRequestHeaders();
    const session = await requireAuthFromHeaders(headers);

    // Verify model ownership
    const model = await db.query.financialModels.findFirst({
      where: and(
        eq(financialModels.id, data.modelId),
        eq(financialModels.userId, session.user.id)
      ),
    });

    if (!model) {
      throw new Error("Model not found");
    }

    // Update or insert scenario
    const existing = await db.query.modelScenarios.findFirst({
      where: and(
        eq(modelScenarios.modelId, data.modelId),
        eq(modelScenarios.scenarioType, data.scenarioType)
      ),
    });

    if (existing) {
      await db
        .update(modelScenarios)
        .set({
          userGrowth: data.data.userGrowth.toString(),
          arpu: data.data.arpu.toString(),
          churnRate: data.data.churnRate.toString(),
          farmerGrowth: data.data.farmerGrowth.toString(),
          cac: data.data.cac.toString(),
          updatedAt: new Date(),
        })
        .where(eq(modelScenarios.id, existing.id));
    } else {
      await db.insert(modelScenarios).values({
        modelId: data.modelId,
        scenarioType: data.scenarioType,
        userGrowth: data.data.userGrowth.toString(),
        arpu: data.data.arpu.toString(),
        churnRate: data.data.churnRate.toString(),
        farmerGrowth: data.data.farmerGrowth.toString(),
        cac: data.data.cac.toString(),
      });
    }

    return { success: true };
  });

const updateSettings = createServerFn({ method: "POST" })
  .inputValidator((data: { modelId: number; data: UpdateSettingsDto }) => data)
  .handler(async ({ data }) => {
    const [
      { getRequestHeaders },
      { requireAuthFromHeaders },
      { db },
      schema,
      { eq, and },
    ] = await Promise.all([
      import("@tanstack/react-start/server"),
      import("@/lib/auth/requireAuth"),
      import("@/db/index"),
      import("@/db/schema"),
      import("drizzle-orm"),
    ]);

    const { financialModels, modelSettings } = schema;

    const headers = getRequestHeaders();
    const session = await requireAuthFromHeaders(headers);

    // Verify model ownership
    const model = await db.query.financialModels.findFirst({
      where: and(
        eq(financialModels.id, data.modelId),
        eq(financialModels.userId, session.user.id)
      ),
    });

    if (!model) {
      throw new Error("Model not found");
    }

    // Update or insert settings
    const existing = await db.query.modelSettings.findFirst({
      where: eq(modelSettings.modelId, data.modelId),
    });

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.data.startUsers !== undefined)
      updateData.startUsers = data.data.startUsers;
    if (data.data.startFarmers !== undefined)
      updateData.startFarmers = data.data.startFarmers;
    if (data.data.taxRate !== undefined)
      updateData.taxRate = data.data.taxRate.toString();
    if (data.data.discountRate !== undefined)
      updateData.discountRate = data.data.discountRate.toString();
    if (data.data.terminalGrowth !== undefined)
      updateData.terminalGrowth = data.data.terminalGrowth.toString();
    if (data.data.safetyBuffer !== undefined)
      updateData.safetyBuffer = data.data.safetyBuffer;
    if (data.data.personnelByYear !== undefined)
      updateData.personnelByYear = data.data.personnelByYear;
    if (data.data.employeesByYear !== undefined)
      updateData.employeesByYear = data.data.employeesByYear;
    if (data.data.capexByYear !== undefined)
      updateData.capexByYear = data.data.capexByYear;
    if (data.data.depreciationByYear !== undefined)
      updateData.depreciationByYear = data.data.depreciationByYear;
    if (data.data.projectionYears !== undefined)
      updateData.projectionYears = data.data.projectionYears;

    if (existing) {
      await db
        .update(modelSettings)
        .set(updateData)
        .where(eq(modelSettings.id, existing.id));
    } else {
      await db.insert(modelSettings).values({
        modelId: data.modelId,
        ...updateData,
      });
    }

    return { success: true };
  });

const updateMarketSizing = createServerFn({ method: "POST" })
  .inputValidator((data: { modelId: number; data: MarketSizingDto }) => data)
  .handler(async ({ data }) => {
    const [
      { getRequestHeaders },
      { requireAuthFromHeaders },
      { db },
      schema,
      { eq, and },
    ] = await Promise.all([
      import("@tanstack/react-start/server"),
      import("@/lib/auth/requireAuth"),
      import("@/db/index"),
      import("@/db/schema"),
      import("drizzle-orm"),
    ]);

    const { financialModels, marketSizing } = schema;

    const headers = getRequestHeaders();
    const session = await requireAuthFromHeaders(headers);

    // Verify model ownership
    const model = await db.query.financialModels.findFirst({
      where: and(
        eq(financialModels.id, data.modelId),
        eq(financialModels.userId, session.user.id)
      ),
    });

    if (!model) {
      throw new Error("Model not found");
    }

    // Update or insert market sizing
    const existing = await db.query.marketSizing.findFirst({
      where: eq(marketSizing.modelId, data.modelId),
    });

    if (existing) {
      await db
        .update(marketSizing)
        .set({
          tam: data.data.tam,
          sam: data.data.sam,
          som: data.data.som,
          updatedAt: new Date(),
        })
        .where(eq(marketSizing.id, existing.id));
    } else {
      await db.insert(marketSizing).values({
        modelId: data.modelId,
        tam: data.data.tam,
        sam: data.data.sam,
        som: data.data.som,
      });
    }

    return { success: true };
  });

const updateMetrics = createServerFn({ method: "POST" })
  .inputValidator((data: { modelId: number; data: UpdateMetricsDto }) => data)
  .handler(async ({ data }) => {
    const [
      { getRequestHeaders },
      { requireAuthFromHeaders },
      { db },
      schema,
      { eq, and },
    ] = await Promise.all([
      import("@tanstack/react-start/server"),
      import("@/lib/auth/requireAuth"),
      import("@/db/index"),
      import("@/db/schema"),
      import("drizzle-orm"),
    ]);

    const { toSnapshotKey } = await import("@/lib/metrics");

    const { financialModels, modelMetrics, metricSnapshot } = schema;

    const headers = getRequestHeaders();
    const session = await requireAuthFromHeaders(headers);

    const model = await db.query.financialModels.findFirst({
      where: and(
        eq(financialModels.id, data.modelId),
        eq(financialModels.userId, session.user.id)
      ),
    });

    if (!model) {
      throw new Error("Model not found");
    }

    const arr = data.data.mrr != null ? data.data.mrr * 12 : data.data.arr;
    const ltvCac =
      data.data.ltv != null && data.data.cac
        ? data.data.ltv / data.data.cac
        : data.data.ltvCac;
    const dauMauRatio =
      data.data.dau != null && data.data.mau
        ? data.data.dau / data.data.mau
        : data.data.dauMauRatio;

    const payload = {
      ...data.data,
      arr,
      ltvCac,
      dauMauRatio,
      updatedAt: new Date(),
    };

    const existing = await db.query.modelMetrics.findFirst({
      where: eq(modelMetrics.modelId, data.modelId),
    });

    if (existing) {
      await db.update(modelMetrics).set(payload).where(eq(modelMetrics.id, existing.id));
    } else {
      await db.insert(modelMetrics).values({
        modelId: data.modelId,
        ...payload,
      });
    }

    // Sync to metric_snapshots for dashboard "Stage-based focus" (default stage: early_growth)
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const stage = "early_growth" as const;

    const saved = await db.query.modelMetrics.findFirst({
      where: eq(modelMetrics.modelId, data.modelId),
    });

    if (saved) {
      await db.delete(metricSnapshot).where(
        and(
          eq(metricSnapshot.userId, session.user.id),
          eq(metricSnapshot.periodEnd, periodEnd),
          eq(metricSnapshot.stage, stage)
        )
      );

      const snapshotRows: Array<{
        userId: string;
        stage: typeof stage;
        metricKey: string;
        value: string;
        periodStart: Date;
        periodEnd: Date;
      }> = [];

      const camelKeys = [
        "usersTotal", "dau", "mau", "growthRate", "activationRate", "retentionRate", "churnRate", "dauMauRatio",
        "mrr", "arr", "arpu", "revenueGrowthRate", "expansionRevenue", "contractionRevenue",
        "cac", "ltv", "ltvCac", "paybackPeriodMonths", "conversionRate", "cpl", "salesCycleLengthDays", "winRate",
        "featureAdoptionRate", "timeToValueDays", "nps", "burnRate", "runwayMonths", "grossMargin", "operatingMargin",
      ] as const;

      for (const camelKey of camelKeys) {
        const raw = saved[camelKey];
        if (raw == null) continue;
        const num = Number(raw);
        if (Number.isNaN(num)) continue;
        snapshotRows.push({
          userId: session.user.id,
          stage,
          metricKey: toSnapshotKey(camelKey),
          value: String(num),
          periodStart,
          periodEnd,
        });
      }

      if (snapshotRows.length > 0) {
        await db.insert(metricSnapshot).values(
          snapshotRows.map((row) => ({
            ...row,
            createdAt: now,
            updatedAt: now,
          }))
        );
      }
    }

    return { success: true };
  });

export const Route = createFileRoute("/models/$modelId")({
  component: ModelDetail,
  loader: async ({ params, location }) => {
    const { requireAuthForLoader } = await import("@/lib/auth/requireAuth");
    await requireAuthForLoader(location);

    const modelId = parseInt((params as { modelId: string }).modelId);
    return loadModelDetail({ data: { modelId } });
  },
});

function ModelDetail() {
  const data = Route.useLoaderData();
  const { model, scenarios, market, settings: loadedSettings, metrics } = data;
  const router = useRouter();

  const settings = useMemo(
    () => loadedSettings || DEFAULT_SETTINGS,
    [loadedSettings]
  );
  const marketSizingData = useMemo(
    () => market || DEFAULT_MARKET_SIZING,
    [market]
  );

  // Use server functions
  const updateScenarioFn = useServerFn(updateScenario);
  const updateSettingsFn = useServerFn(updateSettings);
  const updateMarketSizingFn = useServerFn(updateMarketSizing);
  const updateMetricsFn = useServerFn(updateMetrics);
  const handleExport = async () => {
    try {
      const { exportModelToExcel } = await import("@/lib/excel");
      await exportModelToExcel({
        model: {
          name: model.name,
          currency: model.currency,
        },
        scenarios,
        settings,
        market: marketSizingData,
      });
    } catch (error) {
      console.error("Failed to export Excel:", error);
      alert("Failed to export Excel. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--brand-ink)]">
      <Sidebar />
      <main className="relative md:ml-[var(--sidebar-width)] transition-[margin] duration-300">
        <div className="bg-white border-b border-[var(--border-soft)] px-6 py-4 flex items-center justify-between shadow-sm">
          <div>
            <button
              onClick={() => router.navigate({ to: "/models" })}
              className="text-[var(--brand-primary)] hover:text-[var(--brand-secondary)] text-sm font-medium flex items-center gap-1 mb-2"
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
            <h2 className="text-2xl font-[var(--font-display)] text-[var(--brand-ink)]">
              {model.name}
            </h2>
            {model.companyName && (
              <p className="text-sm text-[var(--brand-muted)] mt-1">
                {model.companyName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--brand-muted)]">
              Currency: {model.currency}
            </span>
            <Link
              to="/models/$modelId/compare"
              params={{ modelId: model.id.toString() }}
              className="px-4 py-2 rounded-full border border-[var(--border-soft)] text-xs text-[var(--brand-muted)] hover:text-[var(--brand-primary)]"
            >
              Compare scenarios
            </Link>
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-full bg-[var(--brand-primary)] text-white text-xs font-semibold shadow-[0_10px_20px_rgba(79,70,186,0.2)]"
            >
              Download Excel
            </button>
          </div>
        </div>
        <div className="px-4 py-6">
          <FinancialModelEditor
            modelId={model.id}
            initialScenarios={scenarios}
            initialSettings={settings}
            initialMarket={marketSizingData}
            initialMetrics={metrics}
            updateScenarioFn={async (data) => {
              const result = await updateScenarioFn({ data });
              return result;
            }}
            updateSettingsFn={async (data) => {
              const result = await updateSettingsFn({ data });
              return result;
            }}
            updateMarketSizingFn={async (data) => {
              const result = await updateMarketSizingFn({ data });
              return result;
            }}
            updateMetricsFn={async (data) => {
              const result = await updateMetricsFn({ data });
              return result;
            }}
          />
        </div>
      </main>
    </div>
  );
}

// Export server functions for use in editor component
export { updateScenario, updateSettings, updateMarketSizing, updateMetrics };
