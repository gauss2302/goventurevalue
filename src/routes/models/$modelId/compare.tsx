import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { AppShell, PageContainer, PageHeader, LoadingState, ErrorState } from "@/components/layout";
import type { ScenarioType } from "@/lib/dto";
import { requireAuthForLoader } from "@/lib/auth/requireAuth";

type ScenarioRow = {
  scenarioType: ScenarioType;
  userGrowth: string;
  arpu: string;
  churnRate: string;
  expansionRate: string;
  grossMarginTarget: string;
  cac: string;
  updatedAt: string;
};

const loadScenarioCompare = createServerFn({ method: "GET" })
  .inputValidator((data: { modelId: number }) => data)
  .handler(async ({ data }) => {
    const [
      { getRequestHeaders },
      { requireAuthFromHeaders },
      { db },
      schema,
      { eq, and, desc },
    ] = await Promise.all([
      import("@tanstack/react-start/server"),
      import("@/lib/auth/server"),
      import("@/db/index"),
      import("@/db/schema"),
      import("drizzle-orm"),
    ]);

    const { financialModels, modelScenarios } = schema;

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

    const scenarios = await db.query.modelScenarios.findMany({
      where: eq(modelScenarios.modelId, data.modelId),
      orderBy: [desc(modelScenarios.updatedAt)],
    });

    return {
      model: {
        id: model.id,
        name: model.name,
        currency: model.currency,
      },
      scenarios: scenarios.map((scenario) => ({
        scenarioType: scenario.scenarioType,
        userGrowth: scenario.userGrowth,
        arpu: scenario.arpu,
        churnRate: scenario.churnRate,
        expansionRate: scenario.expansionRate ?? "0",
        grossMarginTarget: scenario.grossMarginTarget ?? "0.7",
        cac: scenario.cac,
        updatedAt: scenario.updatedAt.toISOString(),
      })) satisfies ScenarioRow[],
    };
  });

const scenarioCompareQueryOptions = (modelId: number) => ({
  queryKey: ["model", modelId, "compare"] as const,
  queryFn: () =>
    loadScenarioCompare({ data: { modelId } }) as Promise<{
      model: { id: number; name: string; currency: string };
      scenarios: ScenarioRow[];
    }>,
  staleTime: 60 * 1000,
});

export const Route = createFileRoute("/models/$modelId/compare")({
  loader: async ({ location, params, context }) => {
    await requireAuthForLoader(location);
    const modelId = parseInt((params as { modelId: string }).modelId);
    await context.queryClient.prefetchQuery(scenarioCompareQueryOptions(modelId));
    return { modelId };
  },
  component: ScenarioComparePage,
});

function ScenarioComparePage() {
  const { modelId } = Route.useLoaderData() as { modelId: number };
  const {
    data,
    isPending,
    error: loadError,
  } = useQuery(scenarioCompareQueryOptions(modelId));

  if (isPending) {
    return (
      <AppShell>
        <PageContainer decorated={false}>
          <LoadingState message="Loading scenario comparison…" />
        </PageContainer>
      </AppShell>
    );
  }

  if (loadError || !data) {
    return (
      <AppShell>
        <PageContainer decorated={false}>
          <ErrorState message="We couldn't load the scenario comparison. Please refresh the page." />
        </PageContainer>
      </AppShell>
    );
  }
  const scenarioMap = new Map<ScenarioType, ScenarioRow>();
  data.scenarios.forEach((scenario) =>
    scenarioMap.set(scenario.scenarioType, scenario)
  );

  const formatPercent = (value: string) => {
    const num = Number(value);
    if (Number.isNaN(num)) return "—";
    const normalized = num > 1 ? num : num * 100;
    return `${normalized.toFixed(1)}%`;
  };

  const formatCurrency = (value: string) => {
    const num = Number(value);
    if (Number.isNaN(num)) return "—";
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: data.model.currency || "USD",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const rows = [
    {
      label: "User growth",
      key: "userGrowth" as const,
      format: formatPercent,
    },
    {
      label: "ARPU",
      key: "arpu" as const,
      format: formatCurrency,
    },
    {
      label: "Churn rate",
      key: "churnRate" as const,
      format: formatPercent,
    },
    {
      label: "Expansion rate",
      key: "expansionRate" as const,
      format: formatPercent,
    },
    {
      label: "Gross margin",
      key: "grossMarginTarget" as const,
      format: formatPercent,
    },
    {
      label: "CAC",
      key: "cac" as const,
      format: formatCurrency,
    },
  ];

  const columns: ScenarioType[] = ["conservative", "base", "optimistic"];
  const columnLabels: Record<ScenarioType, string> = {
    conservative: "Conservative",
    base: "Base",
    optimistic: "Optimistic",
  };

  return (
    <AppShell>
      <PageContainer>
        <div className="space-y-[var(--space-6)]">
          <PageHeader
            eyebrow="Scenario Compare"
            title={data.model.name}
            description="Compare key assumptions across scenarios."
            actions={
              <Button variant="outline" size="sm" className="rounded-full" asChild>
                <Link to="/models/$modelId" params={{ modelId: data.model.id.toString() }}>
                  <ArrowLeft className="size-4" aria-hidden />
                  Back to model
                </Link>
              </Button>
            }
          />

          <div className="-mx-[var(--page-padding-x)] overflow-x-auto px-[var(--page-padding-x)]">
            <div className="min-w-[640px] overflow-hidden rounded-[var(--card-radius)] border border-[var(--border-soft)] bg-[var(--surface)] shadow-[var(--card-shadow)]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[var(--surface-muted)] hover:bg-[var(--surface-muted)]">
                    <TableHead className="text-[var(--brand-muted)]">Metric</TableHead>
                    {columns.map((col) => (
                      <TableHead key={col} className="text-center text-[var(--brand-muted)]">
                        {columnLabels[col]}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell className="font-medium text-[var(--brand-muted)]">
                        {row.label}
                      </TableCell>
                      {columns.map((col) => (
                        <TableCell key={col} className="text-center tabular-nums text-[var(--brand-ink)]">
                          {scenarioMap.get(col) ? row.format(scenarioMap.get(col)![row.key]) : "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
