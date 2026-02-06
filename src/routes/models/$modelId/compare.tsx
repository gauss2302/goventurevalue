import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Sidebar } from "@/components/Sidebar";
import type { ScenarioType } from "@/lib/dto";
import { requireAuthForLoader } from "@/lib/auth/requireAuth";

type ScenarioRow = {
  scenarioType: ScenarioType;
  userGrowth: string;
  arpu: string;
  churnRate: string;
  farmerGrowth: string;
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
      import("@/lib/auth/requireAuth"),
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
        farmerGrowth: scenario.farmerGrowth,
        cac: scenario.cac,
        updatedAt: scenario.updatedAt.toISOString(),
      })) satisfies ScenarioRow[],
    };
  });

export const Route = createFileRoute("/models/$modelId/compare")({
  loader: async ({ location, params }) => {
    await requireAuthForLoader(location);
    const modelId = parseInt((params as { modelId: string }).modelId);
    return loadScenarioCompare({ data: { modelId } });
  },
  component: ScenarioComparePage,
});

function ScenarioComparePage() {
  const data = Route.useLoaderData();
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
      label: "Farmer growth",
      key: "farmerGrowth" as const,
      format: formatPercent,
    },
    {
      label: "CAC",
      key: "cac" as const,
      format: formatCurrency,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--brand-ink)]">
      <Sidebar />
      <main className="relative md:ml-[var(--sidebar-width)] transition-[margin] duration-300">
        <div className="relative px-6 py-10 lg:px-10 max-w-[1200px] mx-auto space-y-6">
          <header className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">
              Scenario Compare
            </p>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-[var(--font-display)]">
                  {data.model.name}
                </h1>
                <p className="text-[var(--brand-muted)]">
                  Compare key assumptions across scenarios.
                </p>
              </div>
              <Link
                to="/models/$modelId"
                params={{ modelId: data.model.id.toString() }}
                className="px-4 py-2 rounded-full border border-[var(--border-soft)] text-sm text-[var(--brand-muted)] hover:text-[var(--brand-primary)]"
              >
                Back to model
              </Link>
            </div>
          </header>

          <div className="bg-white border border-[var(--border-soft)] rounded-2xl shadow-[0_4px_16px_rgba(17,24,39,0.06)] overflow-hidden">
            <div className="grid grid-cols-[1.2fr_repeat(3,1fr)] gap-0 border-b border-[var(--border-soft)] bg-[var(--surface-muted)] text-sm font-semibold text-[var(--brand-muted)]">
              <div className="px-5 py-3">Metric</div>
              <div className="px-5 py-3 text-center">Conservative</div>
              <div className="px-5 py-3 text-center">Base</div>
              <div className="px-5 py-3 text-center">Optimistic</div>
            </div>

            {rows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[1.2fr_repeat(3,1fr)] gap-0 border-b border-[var(--border-soft)] text-sm"
              >
                <div className="px-5 py-4 text-[var(--brand-muted)]">
                  {row.label}
                </div>
                <div className="px-5 py-4 text-center text-[var(--brand-ink)]">
                  {scenarioMap.get("conservative")
                    ? row.format(scenarioMap.get("conservative")![row.key])
                    : "—"}
                </div>
                <div className="px-5 py-4 text-center text-[var(--brand-ink)]">
                  {scenarioMap.get("base")
                    ? row.format(scenarioMap.get("base")![row.key])
                    : "—"}
                </div>
                <div className="px-5 py-4 text-center text-[var(--brand-ink)]">
                  {scenarioMap.get("optimistic")
                    ? row.format(scenarioMap.get("optimistic")![row.key])
                    : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
