import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import ModelList from "../../components/ModelList";
import type { Model } from "../../components/ModelList";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppShell, PageContainer, PageHeader, LoadingState, ErrorState } from "@/components/layout";
import { usePageMotion } from "@/lib/motion";
import { requireAuthForLoader } from "@/lib/auth/requireAuth";

const toNum = (v: string | null): number | null =>
  v == null ? null : (Number.isFinite(Number(v)) ? Number(v) : null);

const loadModels = createServerFn({ method: "GET" }).handler(async () => {
  const [
    { getRequestHeaders },
    { requireAuthFromHeaders },
    { db },
    schema,
    { eq, desc },
  ] = await Promise.all([
    import("@tanstack/react-start/server"),
    import("@/lib/auth/server"),
    import("@/db/index"),
    import("@/db/schema"),
    import("drizzle-orm"),
  ]);

  const { financialModels, modelMonthlyMetrics, modelMetrics } = schema;

  const headers = getRequestHeaders();
  const session = await requireAuthFromHeaders(headers);

  const models = await db.query.financialModels.findMany({
    where: eq(financialModels.userId, session.user.id),
    orderBy: [desc(financialModels.updatedAt)],
  });
  const modelIds = models.map((m) => m.id);
  if (modelIds.length === 0) {
    return [] as Model[];
  }

  const { inArray } = await import("drizzle-orm");
  const monthlyRows = await db.query.modelMonthlyMetrics.findMany({
    where: inArray(modelMonthlyMetrics.modelId, modelIds),
    columns: { modelId: true, month: true, mrr: true },
    orderBy: [desc(modelMonthlyMetrics.month)],
  });
  const latestMrrByModel = new Map<number, number>();
  for (const row of monthlyRows) {
    if (!latestMrrByModel.has(row.modelId)) {
      const n = toNum(row.mrr);
      if (n != null) latestMrrByModel.set(row.modelId, n);
    }
  }

  const metricsRows = await db.query.modelMetrics.findMany({
    where: inArray(modelMetrics.modelId, modelIds),
    columns: { modelId: true, arr: true },
  });
  const arrByModel = new Map<number, number | null>();
  for (const row of metricsRows) {
    const n = toNum(row.arr);
    arrByModel.set(row.modelId, n);
  }

  return models.map((m) => {
    const latestMrr = latestMrrByModel.get(m.id);
    const arrFallback = arrByModel.get(m.id);
    const latestArr =
      latestMrr != null ? latestMrr * 12 : (arrFallback ?? null);
    return {
      id: m.id,
      name: m.name,
      companyName: m.companyName,
      description: m.description,
      stage: m.stage ?? null,
      latestArr: latestArr != null && Number.isFinite(latestArr) ? latestArr : null,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };
  }) as Model[];
});

const modelsQueryOptions = () => ({
  queryKey: ["models"] as const,
  queryFn: () => loadModels() as Promise<Model[]>,
  staleTime: 60 * 1000,
});

export const Route = createFileRoute("/models/")({
  loader: async ({ location, context }) => {
    await requireAuthForLoader(location);
    await context.queryClient.prefetchQuery(modelsQueryOptions());
    return null;
  },
  component: ModelsIndex,
});

function ModelsIndex() {
  const { data: models, isPending, error } = useQuery(modelsQueryOptions());
  const { container, item } = usePageMotion();

  if (isPending) {
    return (
      <AppShell>
        <PageContainer decorated={false}>
          <LoadingState message="Loading your models…" />
        </PageContainer>
      </AppShell>
    );
  }

  if (error || !models) {
    return (
      <AppShell>
        <PageContainer decorated={false}>
          <ErrorState message="We couldn't load your models. Please refresh the page." />
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageContainer>
        <motion.div
          className="space-y-[var(--space-6)]"
          variants={container}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={item}>
            <PageHeader
              eyebrow="Library"
              title="My Models"
              description="Keep every valuation, scenario, and revision in one place."
            />
          </motion.div>

          <motion.div variants={item} className="flex flex-col gap-[var(--space-3)] md:flex-row md:items-center">
            <div className="flex-1">
              <Input type="text" placeholder="Search models, companies, or tags…" />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="default">
                Last updated
              </Button>
              <Button variant="outline" size="default">
                All statuses
              </Button>
            </div>
          </motion.div>

          <motion.div variants={item}>
            <ModelList models={models} />
          </motion.div>
        </motion.div>
      </PageContainer>
    </AppShell>
  );
}
