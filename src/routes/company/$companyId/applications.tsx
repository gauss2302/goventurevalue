import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { SlaBadge } from "@/components/company/SlaBadge";
import { listInboxFn } from "@/lib/server/companyFns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/company/$companyId/applications")({
  loader: async ({ params }) => listInboxFn({ data: { companyId: params.companyId } }),
  component: Applications,
});

/**
 * The inbox.
 *
 * Ordered by deadline rather than arrival: the useful question for a recruiter
 * is not "what is newest" but "what runs out first" (§3.2). That ordering comes
 * from the service, so the list and the reminders agree.
 */
function Applications() {
  const applications = Route.useLoaderData();
  const { companyId } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
      <section className="flex flex-col gap-3">
        <h2
          className="text-[var(--text-title2)] text-[var(--brand-ink)]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
        >
          Applications
        </h2>

        {applications.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="font-semibold text-[var(--brand-ink)]">Nothing waiting</p>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">
              Applications appear here as soon as candidates apply.
            </p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {applications.map((entry) => {
              const href = `/company/${companyId}/applications/${entry.id}`;
              const active = pathname === href;

              return (
                <li key={entry.id}>
                  <Link
                    to="/company/$companyId/applications/$applicationId"
                    params={{ companyId, applicationId: entry.id }}
                  >
                    <Card
                      className={cn(
                        "p-4 transition-colors",
                        active
                          ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5"
                          : "hover:border-[var(--brand-primary)]/40",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[var(--brand-ink)]">
                            {entry.jobTitle}
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--brand-muted)]">
                            Applied {new Date(entry.appliedAt).toLocaleDateString()} ·{" "}
                            {entry.status.replace(/_/g, " ")}
                          </p>
                        </div>
                        <SlaBadge state={entry.slaState} dueAt={entry.slaDueAt} />
                      </div>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <Outlet />
      </section>
    </div>
  );
}
