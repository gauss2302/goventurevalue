import React from "react";
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

type PitchDeckSummary = {
  id: number;
  title: string;
  startupName: string;
  status: string;
  updatedAt: string;
};

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
  lastLoginAt: string | null;
  activities: Array<{
    id: number;
    action: string;
    target: string;
    at: string;
  }>;
  pitchDecks: PitchDeckSummary[];
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
    pitchDecks: pitchDecksTable,
  } = schema;

  const headers = getRequestHeaders();
  const session = await requireAuthFromHeaders(headers);

  const [models, scenariosCountRow, totalStartingUsersRow, lastLoginRow, decks] =
    await Promise.all([
      db.query.financialModels.findMany({
        where: eq(financialModels.userId, session.user.id),
        orderBy: [desc(financialModels.updatedAt)],
      }),
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
      db.query.pitchDecks.findMany({
        where: eq(pitchDecksTable.userId, session.user.id),
        orderBy: [desc(pitchDecksTable.updatedAt)],
      }),
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
    lastLoginAt,
    activities,
    pitchDecks: decks.slice(0, 5).map((d) => ({
      id: d.id,
      title: d.title,
      startupName: d.startupName,
      status: d.status,
      updatedAt: d.updatedAt.toISOString(),
    })),
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
      lastLoginAt: data.lastLoginAt,
      activities: data.activities,
      pitchDecks: data.pitchDecks,
    };
  },
  component: Dashboard,
});

const statusClassName: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  generating: "bg-blue-100 text-blue-700",
  ready: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

function Dashboard() {
  const {
    models,
    user,
    stats,
    lastLoginAt,
    activities,
    pitchDecks,
  } = Route.useLoaderData();
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

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--brand-ink)]">
      <Sidebar />

      <main className="relative md:ml-[var(--sidebar-width)] transition-[margin] duration-300">
        <div className="relative px-6 py-8 lg:px-10 max-w-[1200px] mx-auto">
          <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(79,70,186,0.12),transparent_70%)] blur-3xl" />
          <div className="pointer-events-none absolute top-40 -left-16 h-60 w-60 rounded-full bg-[radial-gradient(circle,rgba(249,137,107,0.12),transparent_70%)] blur-3xl" />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]"
          >
            <div className="space-y-8">
              {/* Header */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
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
                  <div className="px-4 py-2.5 bg-white rounded-full text-sm text-[var(--brand-muted)] border border-[var(--border-soft)] shadow-[var(--card-shadow)]">
                    {formatLastLogin(lastLoginAt)}
                  </div>
                  <Link
                    to="/models/new"
                    className="px-5 py-2.5 rounded-full bg-[var(--brand-primary)] text-white text-sm font-semibold shadow-[0_4px_14px_rgba(79,70,186,0.25)] hover:shadow-[0_6px_20px_rgba(79,70,186,0.3)] transition-shadow"
                  >
                    New model
                  </Link>
                </div>
              </div>

              {/* Stats Overview */}
              <DashboardStats stats={statsData} />

              {/* Quick Actions */}
              <QuickActions />

              {/* My Pitch decks */}
              <div className="bg-white border border-[var(--border-soft)] rounded-[var(--card-radius)] p-6 shadow-[var(--card-shadow)]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">
                      Studio
                    </p>
                    <h3 className="text-lg font-[var(--font-display)] text-[var(--brand-ink)]">
                      My Pitch decks
                    </h3>
                  </div>
                  <Link
                    to={"/pitch-decks/new" as any}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    New deck
                  </Link>
                </div>
                {pitchDecks.length === 0 ? (
                  <>
                    <p className="text-sm text-[var(--brand-muted)] mb-4">
                      No pitch decks yet. Create your first AI-generated deck to share with investors.
                    </p>
                    <Link
                      to={"/pitch-decks/new" as any}
                      className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-[var(--border-soft)] text-[var(--brand-ink)] text-sm font-semibold hover:bg-[var(--surface-muted)] transition-colors"
                    >
                      Create first deck
                    </Link>
                  </>
                ) : (
                  <>
                    <ul className="space-y-3">
                      {pitchDecks.map((deck) => (
                        <li key={deck.id}>
                          <Link
                            to={"/pitch-decks/$deckId" as any}
                            params={{ deckId: String(deck.id) } as any}
                            className="flex items-center justify-between rounded-2xl border border-[var(--border-soft)] px-4 py-3 hover:border-[var(--brand-primary)]/30 hover:bg-[var(--surface-muted)]/50 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-[var(--brand-ink)] truncate">
                                {deck.title}
                              </p>
                              <p className="text-xs text-[var(--brand-muted)] truncate">
                                {deck.startupName}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${statusClassName[deck.status] ?? statusClassName.draft}`}
                              >
                                {deck.status}
                              </span>
                              <span className="text-xs text-[var(--brand-muted)]">
                                {new Date(deck.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link
                      to={"/pitch-decks" as any}
                      className="mt-4 inline-block text-sm font-semibold text-[var(--brand-primary)] hover:underline"
                    >
                      View all
                    </Link>
                  </>
                )}
              </div>

              {/* Models */}
              <ModelList models={models} />
            </div>

            {/* Right Sidebar */}
            <aside className="space-y-6">
              <div className="bg-white border border-[var(--border-soft)] rounded-[var(--card-radius)] p-6 shadow-[var(--card-shadow)]">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-20 h-20 rounded-3xl bg-[linear-gradient(135deg,rgba(79,70,186,0.2),rgba(249,137,107,0.2))] flex items-center justify-center text-[var(--brand-primary)] font-[var(--font-display)] text-lg">
                    {initials}
                  </div>
                  <h4 className="text-lg font-[var(--font-display)] text-[var(--brand-ink)]">
                    {user.name || "Founder"}
                  </h4>
                  <p className="text-xs text-[var(--brand-muted)]">
                    {user.email || "Starter plan"}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-5 text-center">
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
                <div className="mt-5 flex gap-3">
                  <button className="flex-1 rounded-2xl bg-[var(--brand-primary)] text-white py-2.5 text-xs font-semibold shadow-[0_4px_14px_rgba(79,70,186,0.25)] hover:shadow-[0_6px_20px_rgba(79,70,186,0.3)] transition-shadow">
                    Upgrade
                  </button>
                  <button className="flex-1 rounded-2xl border border-[var(--border-soft)] text-[var(--brand-ink)] py-2.5 text-xs font-semibold hover:bg-[var(--surface-muted)] transition-colors">
                    Share
                  </button>
                </div>
              </div>

              <RecentActivity activities={activities} />

              <div className="bg-white border border-[var(--border-soft)] rounded-[var(--card-radius)] p-6 shadow-[var(--card-shadow)] space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">
                    Next steps
                  </p>
                  <h3 className="text-lg font-[var(--font-display)] text-[var(--brand-ink)]">
                    Polish your model
                  </h3>
                </div>
                <div className="space-y-3 text-sm text-[var(--brand-muted)]">
                  <div className="flex items-center justify-between rounded-2xl border border-[var(--border-soft)] px-4 py-2.5 hover:bg-[var(--surface-muted)] transition-colors">
                    <span>Upload your logo</span>
                    <span className="text-[var(--brand-primary)] font-semibold">Add</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-[var(--border-soft)] px-4 py-2.5 hover:bg-[var(--surface-muted)] transition-colors">
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
