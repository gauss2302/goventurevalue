import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { DEFAULT_SETTINGS, DEFAULT_MARKET_SIZING } from "@/lib/calculations";
import { ExportPaywallModal } from "@/components/billing/ExportPaywallModal";
import FinancialModelEditor from "@/components/FinancialModelEditor";
import { Sidebar } from "@/components/Sidebar";
import { assertExportAccess } from "@/lib/billing/serverFns";
import { logger } from "@/lib/logger";
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
            usersTotal: toNullableNumber(metricsData.usersTotal),
            dau: toNullableNumber(metricsData.dau),
            mau: toNullableNumber(metricsData.mau),
            growthRate: toNullableNumber(metricsData.growthRate),
            activationRate: toNullableNumber(metricsData.activationRate),
            retentionRate: toNullableNumber(metricsData.retentionRate),
            churnRate: toNullableNumber(metricsData.churnRate),
            mrr: toNullableNumber(metricsData.mrr),
            arr: toNullableNumber(metricsData.arr),
            arpu: toNullableNumber(metricsData.arpu),
            revenueGrowthRate: toNullableNumber(metricsData.revenueGrowthRate),
            expansionRevenue: toNullableNumber(metricsData.expansionRevenue),
            contractionRevenue: toNullableNumber(metricsData.contractionRevenue),
            cac: toNullableNumber(metricsData.cac),
            ltv: toNullableNumber(metricsData.ltv),
            ltvCac: toNullableNumber(metricsData.ltvCac),
            paybackPeriodMonths: toNullableNumber(metricsData.paybackPeriodMonths),
            conversionRate: toNullableNumber(metricsData.conversionRate),
            cpl: toNullableNumber(metricsData.cpl),
            salesCycleLengthDays: toNullableNumber(metricsData.salesCycleLengthDays),
            winRate: toNullableNumber(metricsData.winRate),
            dauMauRatio: toNullableNumber(metricsData.dauMauRatio),
            featureAdoptionRate: toNullableNumber(metricsData.featureAdoptionRate),
            timeToValueDays: toNullableNumber(metricsData.timeToValueDays),
            nps: toNullableNumber(metricsData.nps),
            burnRate: toNullableNumber(metricsData.burnRate),
            runwayMonths: toNullableNumber(metricsData.runwayMonths),
            grossMargin: toNullableNumber(metricsData.grossMargin),
            operatingMargin: toNullableNumber(metricsData.operatingMargin),
          }
        : null,
    } satisfies LoaderData;
  });

const modelDetailQueryOptions = (modelId: number) => ({
  queryKey: ["model", modelId] as const,
  queryFn: () => loadModelDetail({ data: { modelId } }) as Promise<LoaderData>,
  staleTime: 60 * 1000,
});

const normalizeRateInput = (value: number, min: number, max: number) => {
  const finite = Number.isFinite(value) ? value : 0;
  const fraction = Math.abs(finite) > 1 ? finite / 100 : finite;
  return Math.min(max, Math.max(min, fraction));
};

const toNullableNumber = (value: string | null): number | null =>
  value == null ? null : Number(value);

const normalizeScenarioInput = (input: UpdateScenarioDto) => ({
  userGrowth: normalizeRateInput(input.userGrowth, -0.95, 3),
  arpu: Math.max(0, Number.isFinite(input.arpu) ? input.arpu : 0),
  churnRate: normalizeRateInput(input.churnRate, 0.001, 0.95),
  farmerGrowth: normalizeRateInput(input.farmerGrowth, -0.95, 3),
  cac: Math.max(0, Number.isFinite(input.cac) ? input.cac : 0),
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

    const normalizedScenario = normalizeScenarioInput(data.data);

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
          userGrowth: normalizedScenario.userGrowth.toString(),
          arpu: normalizedScenario.arpu.toString(),
          churnRate: normalizedScenario.churnRate.toString(),
          farmerGrowth: normalizedScenario.farmerGrowth.toString(),
          cac: normalizedScenario.cac.toString(),
          updatedAt: new Date(),
        })
        .where(eq(modelScenarios.id, existing.id));
    } else {
      await db.insert(modelScenarios).values({
        modelId: data.modelId,
        scenarioType: data.scenarioType,
        userGrowth: normalizedScenario.userGrowth.toString(),
        arpu: normalizedScenario.arpu.toString(),
        churnRate: normalizedScenario.churnRate.toString(),
        farmerGrowth: normalizedScenario.farmerGrowth.toString(),
        cac: normalizedScenario.cac.toString(),
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
      updateData.taxRate = normalizeRateInput(data.data.taxRate, 0, 0.9).toString();
    if (data.data.discountRate !== undefined)
      updateData.discountRate = normalizeRateInput(
        data.data.discountRate,
        0.01,
        0.95
      ).toString();
    if (data.data.terminalGrowth !== undefined)
      updateData.terminalGrowth = normalizeRateInput(
        data.data.terminalGrowth,
        -0.2,
        0.2
      ).toString();
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
      data.data.ltv != null &&
      data.data.cac != null &&
      data.data.cac !== 0
        ? data.data.ltv / data.data.cac
        : data.data.ltvCac;
    const dauMauRatio =
      data.data.dau != null &&
      data.data.mau != null &&
      data.data.mau !== 0
        ? data.data.dau / data.data.mau
        : data.data.dauMauRatio;

    const metricsPayload = {
      updatedAt: new Date(),
    } as Partial<typeof modelMetrics.$inferInsert>;

    const sourceMetrics: UpdateMetricsDto = {
      ...data.data,
      arr,
      ltvCac,
      dauMauRatio,
    };

    for (const [key, value] of Object.entries(sourceMetrics) as Array<
      [keyof UpdateMetricsDto, number | null | undefined]
    >) {
      if (value == null) {
        (metricsPayload as Record<string, unknown>)[key] = null;
        continue;
      }

      if (!Number.isFinite(value)) continue;
      (metricsPayload as Record<string, unknown>)[key] = String(value);
    }

    const existing = await db.query.modelMetrics.findFirst({
      where: eq(modelMetrics.modelId, data.modelId),
    });

    if (existing) {
      await db
        .update(modelMetrics)
        .set(metricsPayload)
        .where(eq(modelMetrics.id, existing.id));
    } else {
      const insertPayload = {
        modelId: data.modelId,
        ...metricsPayload,
      } satisfies typeof modelMetrics.$inferInsert;

      await db.insert(modelMetrics).values(insertPayload);
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
  loader: async ({ params, location, context }) => {
    const { requireAuthForLoader } = await import("@/lib/auth/requireAuth");
    await requireAuthForLoader(location);

    const modelId = parseInt((params as { modelId: string }).modelId);
    await context.queryClient.prefetchQuery(modelDetailQueryOptions(modelId));
    return { modelId };
  },
});

function ModelDetail() {
  const { modelId } = Route.useLoaderData() as { modelId: number };
  const {
    data,
    isPending,
    error: loadError,
  } = useQuery(modelDetailQueryOptions(modelId));
  const router = useRouter();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const settings = useMemo(
    () => data?.settings || DEFAULT_SETTINGS,
    [data?.settings]
  );
  const marketSizingData = useMemo(
    () => data?.market || DEFAULT_MARKET_SIZING,
    [data?.market]
  );
  const updateScenarioFn = useServerFn(updateScenario);
  const updateSettingsFn = useServerFn(updateSettings);
  const updateMarketSizingFn = useServerFn(updateMarketSizing);
  const updateMetricsFn = useServerFn(updateMetrics);
  const assertExportAccessFn = useServerFn(assertExportAccess);

  if (isPending) {
    return (
      <div className="min-h-screen bg-[var(--page)] text-[var(--brand-ink)] flex items-center justify-center">
        <div className="text-sm text-[var(--brand-muted)]">
          Loading model...
        </div>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="min-h-screen bg-[var(--page)] text-[var(--brand-ink)] flex items-center justify-center">
        <div className="text-sm text-red-600">
          Failed to load model. Please refresh the page.
        </div>
      </div>
    );
  }

  const { model, scenarios, metrics } = data;

  const ensureExportAllowed = async () => {
    try {
      const access = await assertExportAccessFn({
        data: { returnPath: `/models/${modelId}` },
      });

      if (access.allowed) {
        return true;
      }

      setCheckoutUrl(access.checkoutUrl);
      setPaywallOpen(true);
      return false;
    } catch (error) {
      logger.error("Failed to verify export entitlement:", error);
      toast.error("Could not verify subscription. Please try again.");
      return false;
    }
  };

  const handleExport = async () => {
    try {
      const allowed = await ensureExportAllowed();
      if (!allowed) {
        return;
      }

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
      logger.error("Failed to export Excel:", error);
      toast.error("Failed to export Excel. Please try again.");
    }
  };

  const handleExportPdf = async () => {
    try {
      const allowed = await ensureExportAllowed();
      if (!allowed) {
        return;
      }

      const { exportModelToPdf } = await import("@/lib/pdf");
      await exportModelToPdf({
        model: {
          name: model.name,
          currency: model.currency,
        },
        scenarios,
        settings,
        market: marketSizingData,
      });
    } catch (error) {
      logger.error("Failed to export PDF:", error);
      toast.error("Failed to export PDF. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--brand-ink)]">
      <Sidebar />
      <ExportPaywallModal
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        checkoutUrl={checkoutUrl}
        title="Upgrade to export this model"
        description="Model editing is free. Exporting PDF and Excel files requires Pro ($10/month)."
      />
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
              onClick={handleExportPdf}
              className="px-4 py-2 rounded-full border border-[var(--border-soft)] text-xs text-[var(--brand-muted)] font-semibold hover:text-[var(--brand-primary)] hover:border-[rgba(79,70,186,0.3)]"
            >
              Download PDF
            </button>
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
