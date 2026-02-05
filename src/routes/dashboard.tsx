import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Sidebar } from "../components/Sidebar";
import { DashboardStats } from "../components/DashboardStats";
import { RecentActivity } from "../components/RecentActivity";
import { QuickActions } from "../components/QuickActions";
import ModelList from "../components/ModelList";
import type { Model } from "../components/ModelList";
import { requireAuthForLoader } from "@/lib/auth/requireAuth";

type LoaderData = {
  models: Model[];
  user: {
    name: string | null;
    email: string | null;
  };
  stats: {
    modelsCount: number;
    scenariosCount: number;
    totalStartingUsers: number;
    lastModelUpdatedAt: string | null;
  };
  scenarioBreakdown: {
    conservative: number;
    base: number;
    optimistic: number;
    total: number;
  };
  lastLoginAt: string | null;
  activities: Array<{
    id: number;
    action: string;
    target: string;
    at: string;
  }>;
};

const loadDashboardData = createServerFn({ method: "GET" }).handler(async () => {
  const [
    { getRequestHeaders },
    { requireAuthFromHeaders },
    { db },
    schema,
    { eq, desc, sql },
  ] = await Promise.all([
    import("@tanstack/react-start/server"),
    import("@/lib/auth/requireAuth"),
    import("@/db/index"),
    import("@/db/schema"),
    import("drizzle-orm"),
  ]);

  const {
    financialModels,
    modelScenarios,
    modelSettings,
    session: sessionTable,
  } = schema;

  const headers = getRequestHeaders();
  const session = await requireAuthFromHeaders(headers);

  const models = await db.query.financialModels.findMany({
    where: eq(financialModels.userId, session.user.id),
    orderBy: [desc(financialModels.updatedAt)],
  });

  const [scenariosCountRow, totalStartingUsersRow, lastLoginRow] =
    await Promise.all([
      db
        .select({
          scenarioType: modelScenarios.scenarioType,
          count: sql<number>`count(*)`,
        })
        .from(modelScenarios)
        .innerJoin(
          financialModels,
          eq(modelScenarios.modelId, financialModels.id)
        )
        .where(eq(financialModels.userId, session.user.id))
        .groupBy(modelScenarios.scenarioType),
      db
        .select({
          total: sql<number>`coalesce(sum(${modelSettings.startUsers}), 0)`,
        })
        .from(modelSettings)
        .innerJoin(
          financialModels,
          eq(modelSettings.modelId, financialModels.id)
        )
        .where(eq(financialModels.userId, session.user.id)),
      db
        .select({ createdAt: sessionTable.createdAt })
        .from(sessionTable)
        .where(eq(sessionTable.userId, session.user.id))
        .orderBy(desc(sessionTable.createdAt))
        .limit(1),
    ]);

  const scenarioCounts = scenariosCountRow.reduce(
    (acc, row) => {
      acc[row.scenarioType] = Number(row.count ?? 0);
      return acc;
    },
    {
      conservative: 0,
      base: 0,
      optimistic: 0,
    } as Record<"conservative" | "base" | "optimistic", number>
  );
  const scenariosCount =
    scenarioCounts.conservative +
    scenarioCounts.base +
    scenarioCounts.optimistic;
  const totalStartingUsers = Number(totalStartingUsersRow[0]?.total ?? 0);
  const lastModelUpdatedAt = models[0]?.updatedAt
    ? models[0].updatedAt.toISOString()
    : null;
  const lastLoginAt = lastLoginRow[0]?.createdAt
    ? lastLoginRow[0].createdAt.toISOString()
    : null;

  const activities = models.slice(0, 4).map((model) => ({
    id: model.id,
    action:
      model.updatedAt.getTime() === model.createdAt.getTime()
        ? "Created model"
        : "Updated model",
    target: model.name,
    at: (model.updatedAt || model.createdAt).toISOString(),
  }));

  return {
    user: {
      name: session.user.name ?? null,
      email: session.user.email ?? null,
    },
    models: models.map((m) => ({
      id: m.id,
      name: m.name,
      companyName: m.companyName,
      description: m.description,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    })),
    stats: {
      modelsCount: models.length,
      scenariosCount,
      totalStartingUsers,
      lastModelUpdatedAt,
    },
    scenarioBreakdown: {
      conservative: scenarioCounts.conservative,
      base: scenarioCounts.base,
      optimistic: scenarioCounts.optimistic,
      total: scenariosCount,
    },
    lastLoginAt,
    activities,
  };
});

export const Route = createFileRoute("/dashboard")({
  loader: async ({ location }): Promise<LoaderData> => {
    await requireAuthForLoader(location);
    const data = await loadDashboardData();

    return {
      models: data.models,
      user: data.user,
      stats: data.stats,
      scenarioBreakdown: data.scenarioBreakdown,
      lastLoginAt: data.lastLoginAt,
      activities: data.activities,
    };
  },
  component: Dashboard,
});

function Dashboard() {
  const { models, user, stats, scenarioBreakdown, lastLoginAt, activities } =
    Route.useLoaderData();
  const initials =
    user.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    user.email?.slice(0, 2).toUpperCase() ||
    "GV";

  const numberFormat = new Intl.NumberFormat();
  const formatDateShort = (value: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  const formatLastLogin = (value: string | null) => {
    if (!value) return "Last login: —";
    const date = new Date(value);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    const time = date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    if (isToday) return `Last login: Today, ${time}`;
    if (isYesterday) return `Last login: Yesterday, ${time}`;
    return `Last login: ${date.toLocaleDateString()}, ${time}`;
  };

  const statsData = [
    {
      label: "Total Models",
      value: numberFormat.format(stats.modelsCount),
      helper: "Financial models",
      tone: "primary" as const,
    },
    {
      label: "Active Scenarios",
      value: numberFormat.format(stats.scenariosCount),
      helper: "Across models",
      tone: "secondary" as const,
    },
    {
      label: "Starting Users",
      value: numberFormat.format(stats.totalStartingUsers),
      helper: "Initial cohorts",
      tone: "ice" as const,
    },
    {
      label: "Last Update",
      value: formatDateShort(stats.lastModelUpdatedAt),
      helper: "Most recent model",
      tone: "accent" as const,
    },
  ];

  const formatCompact = (value: number) =>
    new Intl.NumberFormat(undefined, { notation: "compact" }).format(value);

  const scenarioPercent = (count: number) => {
    if (scenarioBreakdown.total === 0) return "0%";
    return `${Math.round((count / scenarioBreakdown.total) * 100)}%`;
  };

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--brand-ink)]">
      <Sidebar />

      <main className="relative md:ml-[var(--sidebar-width)] transition-[margin] duration-300">
        <div className="relative px-6 py-8 lg:px-10 max-w-[1200px] mx-auto">
          <div className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(79,70,186,0.18),transparent_70%)]" />
          <div className="pointer-events-none absolute top-40 -left-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(249,137,107,0.18),transparent_70%)]" />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]"
          >
            <div className="space-y-8">
              {/* Header */}
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">
                    Dashboard
                  </p>
                  <h1 className="text-3xl lg:text-4xl font-[var(--font-display)] text-[var(--brand-ink)] mb-2">
                    Valuation Command Center
                  </h1>
                  <p className="text-[var(--brand-muted)]">
                    {`Welcome back${user.name ? `, ${user.name}` : ""}. Track your models, scenarios, and momentum at a glance.`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 bg-white rounded-full text-xs text-[var(--brand-muted)] border border-[var(--border-soft)]">
                    {formatLastLogin(lastLoginAt)}
                  </div>
                  <Link
                    to="/models/new"
                    className="px-4 py-2 rounded-full bg-[var(--brand-primary)] text-white text-xs font-semibold shadow-[0_10px_20px_rgba(79,70,186,0.2)]"
                  >
                    New model
                  </Link>
                </div>
              </div>

              {/* Stats Overview */}
              <DashboardStats stats={statsData} />

              {/* Analytics + Performance */}
              <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="bg-white border border-[var(--border-soft)] rounded-2xl p-6 shadow-[0_4px_16px_rgba(17,24,39,0.06)]">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">
                        Analytics
                      </p>
                      <h3 className="text-lg font-[var(--font-display)] text-[var(--brand-ink)]">
                        Monthly runway projection
                      </h3>
                    </div>
                    <span className="text-xs text-[var(--brand-muted)] bg-[#F6F6FC] px-2 py-1 rounded-full">
                      2026
                    </span>
                  </div>
                  <div className="relative mt-6 h-40 rounded-2xl bg-[linear-gradient(120deg,rgba(79,70,186,0.08),rgba(132,232,244,0.12))] overflow-hidden">
                    <div className="absolute inset-0 grid grid-rows-4 border-t border-white/60">
                      <div className="border-b border-white/60" />
                      <div className="border-b border-white/60" />
                      <div className="border-b border-white/60" />
                    </div>
                    <svg
                      viewBox="0 0 400 160"
                      className="absolute inset-0 h-full w-full"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0,120 C40,110 80,80 120,90 C160,100 200,60 240,70 C280,80 320,40 360,50 C380,55 390,70 400,80"
                        fill="none"
                        stroke="#4F46BA"
                        strokeWidth="3"
                      />
                      <path
                        d="M0,130 C40,120 80,100 120,110 C160,120 200,90 240,95 C280,100 320,70 360,75 C380,78 390,90 400,95"
                        fill="none"
                        stroke="#84E8F4"
                        strokeWidth="2"
                        opacity="0.8"
                      />
                    </svg>
                  </div>
                </div>

                <div className="bg-white border border-[var(--border-soft)] rounded-2xl p-6 shadow-[0_4px_16px_rgba(17,24,39,0.06)]">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">
                        Scenarios
                      </p>
                      <h3 className="text-lg font-[var(--font-display)] text-[var(--brand-ink)]">
                        Mix of outcomes
                      </h3>
                    </div>
                  </div>
                <div className="flex items-center gap-4">
                  <div className="relative h-28 w-28">
                    <div className="absolute inset-0 rounded-full bg-[conic-gradient(#4F46BA_0deg_160deg,#F9896B_160deg_260deg,#84E8F4_260deg_360deg)]" />
                    <div className="absolute inset-4 rounded-full bg-white" />
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-[var(--brand-ink)]">
                        {scenarioBreakdown.total}
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-[var(--brand-muted)]">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[var(--brand-primary)]" />
                        Base case {scenarioPercent(scenarioBreakdown.base)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[var(--brand-secondary)]" />
                        Optimistic {scenarioPercent(scenarioBreakdown.optimistic)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[var(--brand-ice)]" />
                        Conservative {scenarioPercent(scenarioBreakdown.conservative)}
                    </div>
                  </div>
                </div>
              </div>
              </div>

              {/* Quick Actions */}
              <QuickActions />

              {/* Models */}
              <ModelList models={models} />
            </div>

            {/* Right Sidebar */}
            <aside className="space-y-6">
              <div className="bg-white border border-[var(--border-soft)] rounded-2xl p-6 shadow-[0_4px_16px_rgba(17,24,39,0.06)]">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-2xl bg-[linear-gradient(135deg,rgba(79,70,186,0.2),rgba(249,137,107,0.2))] flex items-center justify-center text-[var(--brand-primary)] font-[var(--font-display)] text-lg mb-3">
                    {initials}
                  </div>
                  <h4 className="text-lg font-[var(--font-display)] text-[var(--brand-ink)]">
                    {user.name || "Founder"}
                  </h4>
                  <p className="text-xs text-[var(--brand-muted)]">
                    {user.email || "Starter plan"}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-6 text-center">
                  <div>
                    <p className="text-base font-semibold text-[var(--brand-ink)]">
                      {numberFormat.format(stats.modelsCount)}
                    </p>
                    <p className="text-xs text-[var(--brand-muted)]">Models</p>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-[var(--brand-ink)]">
                      {numberFormat.format(stats.scenariosCount)}
                    </p>
                    <p className="text-xs text-[var(--brand-muted)]">Scenarios</p>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-[var(--brand-ink)]">
                      {formatCompact(stats.totalStartingUsers)}
                    </p>
                    <p className="text-xs text-[var(--brand-muted)]">
                      Starting users
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button className="flex-1 rounded-xl bg-[var(--brand-primary)] text-white py-2 text-xs font-semibold shadow-[0_10px_20px_rgba(79,70,186,0.2)]">
                    Upgrade
                  </button>
                  <button className="flex-1 rounded-xl border border-[var(--border-soft)] text-[var(--brand-ink)] py-2 text-xs font-semibold">
                    Share
                  </button>
                </div>
              </div>

              <RecentActivity activities={activities} />

              <div className="bg-white border border-[var(--border-soft)] rounded-2xl p-6 shadow-[0_4px_16px_rgba(17,24,39,0.06)] space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">
                    Next steps
                  </p>
                  <h3 className="text-lg font-[var(--font-display)] text-[var(--brand-ink)]">
                    Polish your model
                  </h3>
                </div>
                <div className="space-y-3 text-sm text-[var(--brand-muted)]">
                  <div className="flex items-center justify-between rounded-xl border border-[var(--border-soft)] px-3 py-2">
                    <span>Upload your logo</span>
                    <span className="text-[var(--brand-primary)] font-semibold">Add</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-[var(--border-soft)] px-3 py-2">
                    <span>Set default currency</span>
                    <span className="text-[var(--brand-primary)] font-semibold">Update</span>
                  </div>
                </div>
              </div>
            </aside>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
