import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";

import { getCompanyOverview } from "@/lib/server/companyFns";
import { requireAuthForLoader } from "@/lib/auth/requireAuth";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/company/$companyId")({
  beforeLoad: async ({ location }) => {
    await requireAuthForLoader(location);
  },
  loader: async ({ params }) => getCompanyOverview({ data: { companyId: params.companyId } }),
  component: CompanyLayout,
});

const NAV = [
  { to: "/company/$companyId", label: "Overview", exact: true },
  { to: "/company/$companyId/roles", label: "Roles", exact: false },
  { to: "/company/$companyId/applications", label: "Applications", exact: false },
  { to: "/company/$companyId/team", label: "Team", exact: false },
] as const;

function CompanyLayout() {
  const overview = Route.useLoaderData();
  const { companyId } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { dashboard } = overview;

  return (
    <div className="min-h-screen bg-[var(--page)]">
      <header className="border-b border-[var(--surface-muted-border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-[1100px] px-6 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                to="/company"
                className="text-sm text-[var(--brand-muted)] hover:text-[var(--brand-ink)]"
              >
                ← All companies
              </Link>
              <h1
                className="text-[var(--text-title2)] text-[var(--brand-ink)]"
                style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
              >
                {overview.company.name}
              </h1>
              {overview.publishable ? (
                <Badge variant="success">Live</Badge>
              ) : (
                <Badge variant="warning">Setup incomplete</Badge>
              )}
            </div>

            {/* The obligation stays visible on every screen, not only the
                dashboard: a commitment you have to navigate to is one you forget. */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[var(--brand-muted)]">
                Awaiting reply:{" "}
                <strong className="text-[var(--brand-ink)]">{dashboard.awaitingReply}</strong>
              </span>
              {dashboard.overdue > 0 && (
                <Badge variant="danger">{dashboard.overdue} overdue</Badge>
              )}
              {dashboard.overdue === 0 && dashboard.dueWithin24h > 0 && (
                <Badge variant="warning">{dashboard.dueWithin24h} due today</Badge>
              )}
            </div>
          </div>

          <nav className="mt-5 flex gap-1">
            {NAV.map((item) => {
              const href = item.to.replace("$companyId", companyId);
              const active = item.exact ? pathname === href : pathname.startsWith(href);

              return (
                <Link
                  key={item.label}
                  to={item.to}
                  params={{ companyId }}
                  className={cn(
                    "rounded-t-[var(--radius-sm)] px-4 py-2.5 text-sm transition-colors",
                    active
                      ? "border-b-2 border-[var(--brand-primary)] font-semibold text-[var(--brand-primary)]"
                      : "border-b-2 border-transparent text-[var(--brand-muted)] hover:text-[var(--brand-ink)]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
