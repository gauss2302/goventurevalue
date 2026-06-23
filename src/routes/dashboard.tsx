import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Layers,
  Users,
  Clock,
  Presentation,
  Plus,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import ModelList from "../components/ModelList";
import type { Model } from "../components/ModelList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SubTitle } from "@/components/ui/typography";
import { AppShell, DashboardHeader, PageContainer, LoadingState, ErrorState } from "@/components/layout";
import { cn } from "@/lib/utils";
import { usePageMotion } from "@/lib/motion";
import { requireAuthForLoader } from "@/lib/auth/requireAuth";
import { openBillingPortal, startBillingCheckout } from "@/lib/billing/serverFns";
import type { PresentationStatus } from "@/lib/dto";

type PitchDeckSummary = {
  id: number;
  title: string;
  startupName: string;
  status: PresentationStatus;
  updatedAt: string;
};

type LoaderData = {
  models: Model[];
  user: {
    name: string | null;
    email: string | null;
    plan: "free" | "pro";
  };
  stats: {
    modelsCount: number;
    scenariosCount: number;
    totalStartingUsers: number;
    lastModelUpdatedAt: string | null;
  };
  lastLoginAt: string | null;
  pitchDecks: PitchDeckSummary[];
};

const loadDashboardData = createServerFn({ method: "GET" }).handler(async () => {
  const [
    { getRequestHeaders },
    { requireAuthFromHeaders },
    { db },
    schema,
    { eq, desc, sql, and },
  ] = await Promise.all([
    import("@tanstack/react-start/server"),
    import("@/lib/auth/server"),
    import("@/db/index"),
    import("@/db/schema"),
    import("drizzle-orm"),
  ]);

  const {
    financialModels,
    modelScenarios,
    modelSettings,
    billingSubscriptions,
    session: sessionTable,
    pitchDecks: pitchDecksTable,
  } = schema;

  const headers = getRequestHeaders();
  const session = await requireAuthFromHeaders(headers);

  const [models, scenariosCountRow, totalStartingUsersRow, lastLoginRow, decks, billingSnapshot] =
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
        where: and(
          eq(pitchDecksTable.userId, session.user.id),
          eq(pitchDecksTable.status, "ready")
        ),
        orderBy: [desc(pitchDecksTable.updatedAt)],
      }),
      db.query.billingSubscriptions.findFirst({
        where: eq(billingSubscriptions.userId, session.user.id),
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
  const plan =
    billingSnapshot &&
    (billingSnapshot.status === "active" ||
      billingSnapshot.status === "trialing")
      ? "pro"
      : "free";

  return {
    user: {
      name: session.user.name ?? null,
      email: session.user.email ?? null,
      plan,
    },
    models: models.map((m) => ({
      id: m.id,
      name: m.name,
      companyName: m.companyName,
      description: m.description,
      stage: m.stage,
      latestArr: null,
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
    pitchDecks: decks.slice(0, 5).map((d) => ({
      id: d.id,
      title: d.title,
      startupName: d.startupName,
      status: d.status,
      updatedAt: d.updatedAt.toISOString(),
    })),
  };
});

const dashboardQueryOptions = () => ({
  queryKey: ["dashboard"] as const,
  queryFn: () => loadDashboardData() as Promise<LoaderData>,
  staleTime: 60 * 1000,
});

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search: Record<string, unknown>) => ({
    billing: search.billing === "success" ? ("success" as const) : undefined,
  }),
  loader: async ({ location, context }) => {
    await requireAuthForLoader(location);
    await context.queryClient.prefetchQuery(dashboardQueryOptions());
    return null;
  },
  component: Dashboard,
});

const statusBadgeVariant: Record<
  PresentationStatus,
  "secondary" | "info" | "success" | "destructive"
> = {
  draft: "secondary",
  generating: "info",
  ready: "success",
  failed: "destructive",
};

type StatTone = "primary" | "secondary" | "info" | "accent";
type StatRoute = "/models" | "/pitch-decks" | "/assumptions";

const statToneWrap: Record<StatTone, string> = {
  primary:
    "bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] text-[var(--brand-primary-hover)]",
  secondary:
    "bg-[color-mix(in_srgb,var(--brand-secondary)_14%,transparent)] text-[var(--brand-secondary)]",
  info: "bg-[color-mix(in_srgb,var(--info)_12%,transparent)] text-[var(--info)]",
  accent:
    "bg-[color-mix(in_srgb,var(--brand-accent)_16%,transparent)] text-[#92610a] dark:text-[var(--brand-accent)]",
};

function StatTile({
  icon: Icon,
  value,
  label,
  helper,
  tone,
  to,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  helper: string;
  tone: StatTone;
  to?: StatRoute;
}) {
  const body = (
    <>
      <div className="mb-[var(--space-2)] flex items-center justify-between">
        <span className={cn("flex size-8 items-center justify-center rounded-lg", statToneWrap[tone])}>
          <Icon size={15} strokeWidth={1.85} aria-hidden />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-muted)]">
          {helper}
        </span>
      </div>
      <p className="font-display text-[var(--text-title2)] font-bold leading-none tracking-[-0.01em] text-[var(--brand-ink)] tabular-nums">
        {value}
      </p>
      <p className="mt-1 flex items-center gap-1 text-[var(--text-caption1)] leading-tight text-[var(--brand-muted)]">
        {label}
        {to ? (
          <ArrowUpRight
            size={11}
            className="opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
        ) : null}
      </p>
    </>
  );

  const baseClass =
    "rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] px-[var(--space-4)] py-[var(--space-3)] shadow-[var(--card-shadow)] transition-all duration-300 [transition-timing-function:var(--ease-out-quint)] hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)]";

  if (to) {
    return (
      <Link
        to={to}
        className={cn(
          baseClass,
          "group block hover:border-[color-mix(in_srgb,var(--brand-primary)_35%,var(--border-soft))]"
        )}
      >
        {body}
      </Link>
    );
  }
  return <div className={cn(baseClass, "group")}>{body}</div>;
}

function Dashboard() {
  const { data, isPending, error } = useQuery(dashboardQueryOptions());
  const startBillingCheckoutFn = useServerFn(startBillingCheckout);
  const openBillingPortalFn = useServerFn(openBillingPortal);
  const { billing } = Route.useSearch();
  const queryClient = useQueryClient();
  const { container, item } = usePageMotion();

  useEffect(() => {
    if (billing === "success") {
      toast.success("You're now on Pro! Your subscription is active.");
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  }, [billing, queryClient]);

  if (isPending) {
    return (
      <AppShell>
        <PageContainer decorated={false}>
          <LoadingState message="Loading your workspace…" />
        </PageContainer>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <PageContainer decorated={false}>
          <ErrorState message="We couldn't load your dashboard. Please refresh the page." />
        </PageContainer>
      </AppShell>
    );
  }

  const { models, user, stats, pitchDecks, lastLoginAt } = data;
  const initials =
    user.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    user.email?.slice(0, 2).toUpperCase() ||
    "HM";

  const numberFormat = new Intl.NumberFormat();
  const formatShortDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : "—";

  const handleStartCheckout = async () => {
    try {
      const { url } = await startBillingCheckoutFn({
        data: { returnPath: "/dashboard" },
      });
      window.location.assign(url);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to start checkout.";
      toast.error(message);
    }
  };

  const handleOpenPortal = async () => {
    try {
      const { url } = await openBillingPortalFn({
        data: { returnPath: "/dashboard" },
      });
      window.location.assign(url);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to open billing portal.";
      toast.error(message);
    }
  };

  const statTiles: Array<{
    icon: LucideIcon;
    value: string;
    label: string;
    helper: string;
    tone: StatTone;
    to?: StatRoute;
  }> = [
    {
      icon: FileSpreadsheet,
      value: String(stats.modelsCount),
      label: "Financial models",
      helper: "Total",
      tone: "primary",
      to: "/models",
    },
    {
      icon: Layers,
      value: String(stats.scenariosCount),
      label: "Active scenarios",
      helper: "All models",
      tone: "secondary",
      to: "/models",
    },
    {
      icon: Users,
      value:
        stats.totalStartingUsers > 0
          ? numberFormat.format(stats.totalStartingUsers)
          : "—",
      label: "Starting users",
      helper: "Cohorts",
      tone: "info",
      to: "/assumptions",
    },
    {
      icon: Clock,
      value: formatShortDate(stats.lastModelUpdatedAt),
      label: "Last updated",
      helper: "Activity",
      tone: "accent",
    },
  ];

  return (
    <AppShell>
      <DashboardHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user.name?.split(" ")[0] || "Founder"}`}
        actions={
          <>
            <Button variant="brand" size="sm" asChild>
              <Link to="/models/new">
                <Plus className="size-4" strokeWidth={2.5} />
                <span className="hidden sm:inline">New model</span>
              </Link>
            </Button>
            {user.plan === "pro" ? (
              <Button variant="ghost-brand" size="sm" onClick={handleOpenPortal}>
                Manage plan
              </Button>
            ) : (
              <Button variant="accent" size="sm" onClick={handleStartCheckout}>
                Upgrade
              </Button>
            )}
            <div className="ml-1 flex items-center gap-2 border-l border-[var(--border-soft)] pl-2">
              <div className="hidden text-right leading-tight sm:block">
                <p className="text-[var(--text-caption1)] font-semibold text-[var(--brand-ink)]">
                  {user.name || "Founder"}
                </p>
                <p className="text-[var(--text-caption2)] text-[var(--brand-muted)]">Founder</p>
              </div>
              <Avatar className="size-9">
                <AvatarFallback className="bg-[var(--brand-primary-muted)] font-display text-[var(--text-caption1)] font-bold text-[var(--brand-primary-hover)]">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </>
        }
      />

      <PageContainer>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={container}
          className="space-y-[var(--space-4)]"
        >
          <motion.div
            variants={item}
            className="grid grid-cols-2 gap-[var(--space-3)] lg:grid-cols-4"
          >
            {statTiles.map((tile) => (
              <StatTile key={tile.label} {...tile} />
            ))}
          </motion.div>

          <motion.div
            variants={item}
            className="grid gap-[var(--space-4)] lg:grid-cols-3"
          >
            <div className="lg:col-span-2">
              <ModelList models={models} />
            </div>

            <div className="space-y-[var(--space-4)]">
              <section className="rounded-[var(--card-radius)] border border-[var(--border-soft)] bg-[var(--surface)] p-[var(--space-4)] shadow-[var(--card-shadow)]">
                <div className="flex items-center justify-between gap-2">
                  <SubTitle className="text-[length:var(--text-subheadline)]">
                    Pitch decks
                  </SubTitle>
                  <Button variant="ghost-brand" size="sm" asChild>
                    <Link to="/pitch-decks/new">
                      <Plus className="size-4" strokeWidth={2.5} />
                      New
                    </Link>
                  </Button>
                </div>

                {pitchDecks.length > 0 ? (
                  <>
                    <ul className="mt-[var(--space-3)] space-y-1">
                      {pitchDecks.map((deck) => (
                        <li key={deck.id}>
                          <Link
                            to="/pitch-decks/$deckId"
                            params={{ deckId: String(deck.id) }}
                            className="group flex items-center gap-[var(--space-3)] rounded-[var(--radius-md)] border border-transparent px-[var(--space-2)] py-[var(--space-2)] transition-colors hover:border-[var(--border-soft)] hover:bg-[var(--page)]"
                          >
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] text-[var(--brand-primary-hover)]">
                              <Presentation size={16} strokeWidth={1.85} aria-hidden />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[var(--text-caption1)] font-semibold text-[var(--brand-ink)] transition-colors group-hover:text-[var(--brand-primary-hover)]">
                                {deck.title}
                              </span>
                              <span className="block truncate text-[var(--text-caption2)] text-[var(--brand-muted)]">
                                {deck.startupName} · {formatShortDate(deck.updatedAt)}
                              </span>
                            </span>
                            <Badge
                              variant={statusBadgeVariant[deck.status] ?? "secondary"}
                              className="shrink-0 capitalize"
                            >
                              {deck.status}
                            </Badge>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/pitch-decks"
                      className="mt-[var(--space-3)] flex items-center justify-center gap-1 text-[var(--text-caption1)] font-semibold text-[var(--brand-primary-hover)] hover:underline"
                    >
                      View all decks <ArrowRight size={12} aria-hidden />
                    </Link>
                  </>
                ) : (
                  <div className="mt-[var(--space-3)] rounded-[var(--radius-lg)] border border-dashed border-[var(--border-soft)] bg-[var(--page)] px-[var(--space-4)] py-[var(--space-5)] text-center">
                    <Presentation
                      className="mx-auto mb-1.5 size-7 text-[color-mix(in_srgb,var(--brand-primary)_45%,transparent)]"
                      aria-hidden
                    />
                    <p className="text-[var(--text-caption1)] font-medium text-[var(--brand-ink)]">
                      No decks yet
                    </p>
                    <p className="mt-0.5 text-[var(--text-caption2)] text-[var(--brand-muted)]">
                      Generate an investor-ready deck from a model.
                    </p>
                    <Button variant="brand" size="sm" className="mt-[var(--space-3)]" asChild>
                      <Link to="/pitch-decks/new">
                        <Plus className="size-4" strokeWidth={2.5} />
                        Create deck
                      </Link>
                    </Button>
                  </div>
                )}
              </section>

              <section className="rounded-[var(--card-radius)] border border-[var(--border-soft)] bg-[var(--surface)] p-[var(--space-4)] shadow-[var(--card-shadow)]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--brand-accent)_16%,transparent)] text-[#92610a] dark:text-[var(--brand-accent)]">
                      <Sparkles size={15} strokeWidth={1.9} aria-hidden />
                    </span>
                    <div className="leading-tight">
                      <p className="text-[var(--text-caption1)] font-semibold text-[var(--brand-ink)]">
                        {user.plan === "pro" ? "Pro plan" : "Free plan"}
                      </p>
                      <p className="text-[var(--text-caption2)] text-[var(--brand-muted)]">
                        Last login {formatShortDate(lastLoginAt)}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={user.plan === "pro" ? "success" : "secondary"}
                    className="capitalize"
                  >
                    {user.plan}
                  </Badge>
                </div>
                <p className="mt-[var(--space-3)] text-[var(--text-caption1)] text-[var(--brand-muted)]">
                  {user.plan === "pro"
                    ? "Unlimited models, scenarios, and deck exports."
                    : "Upgrade to unlock unlimited models and deck exports."}
                </p>
                <Button
                  variant={user.plan === "pro" ? "outline" : "accent"}
                  size="sm"
                  className="mt-[var(--space-3)] w-full"
                  onClick={user.plan === "pro" ? handleOpenPortal : handleStartCheckout}
                >
                  {user.plan === "pro" ? "Manage plan" : "Upgrade to Pro"}
                </Button>
              </section>
            </div>
          </motion.div>
        </motion.div>
      </PageContainer>
    </AppShell>
  );
}
