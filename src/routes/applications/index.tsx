import { Link, createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SlaBadge } from "@/components/company/SlaBadge";
import { requireAuthForLoader } from "@/lib/auth/requireAuth";
import { getMyQuota, listMyApplicationsFn } from "@/lib/server/candidateFns";

export const Route = createFileRoute("/applications/")({
  beforeLoad: async ({ location }) => {
    await requireAuthForLoader(location);
  },
  loader: async () => {
    const [applications, quota] = await Promise.all([listMyApplicationsFn(), getMyQuota()]);
    return { applications, quota };
  },
  component: MyApplications,
});

/**
 * The candidate's tracker.
 *
 * A list of what is happening, not a list of things that were sent. Each row
 * carries the stage the candidate has been told about, the last thing that
 * actually happened, and whether any of it is unread — the detail behind each is
 * one click away (§3.2).
 */
function MyApplications() {
  const { applications, quota } = Route.useLoaderData();
  const unread = applications.reduce((total, entry) => total + entry.unreadCount, 0);

  return (
    <div className="mx-auto max-w-[860px] px-6 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1
          className="text-[var(--text-title1)] text-[var(--brand-ink)]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
        >
          Your applications
        </h1>
        {unread > 0 && <Badge variant="brand">{unread} new</Badge>}
      </div>

      <Card className="mt-6 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="font-semibold text-[var(--brand-ink)]">
            {quota.remaining} of {quota.limit} applications left this week
          </p>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            {/* The cap is what makes the reply promise keepable, so it is
                explained rather than presented as a restriction (§3.2). */}
            The limit is what keeps companies able to answer everyone. It comes back on{" "}
            {new Date(quota.resetsAt).toLocaleDateString(undefined, { weekday: "long" })}.
          </p>
        </div>
        <Button asChild variant="brand">
          <Link to="/jobs">Browse roles</Link>
        </Button>
      </Card>

      {applications.length === 0 ? (
        <Card className="mt-6 p-10 text-center">
          <p className="font-semibold text-[var(--brand-ink)]">Nothing applied to yet</p>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            Every company on the board has committed to replying to you.
          </p>
        </Card>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {applications.map((entry) => (
            <li key={entry.id}>
              <Link
                to="/applications/$applicationId"
                params={{ applicationId: entry.id }}
                className="block"
              >
                <Card className="p-5 transition-colors hover:border-[var(--brand-primary)]/40">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[var(--brand-ink)]">
                          {entry.jobTitle}
                        </span>
                        <Badge variant="neutral">{entry.stageLabel}</Badge>
                        {entry.unreadCount > 0 && <Badge variant="brand">New</Badge>}
                      </div>
                      <p className="mt-0.5 text-sm text-[var(--brand-muted)]">
                        {entry.companyName} · applied{" "}
                        {new Date(entry.appliedAt).toLocaleDateString()}
                      </p>

                      {/* The last thing that happened, whoever it came from —
                          the row should never read as "submitted" forever. */}
                      {entry.lastUpdate && (
                        <p className="mt-1.5 text-xs text-[var(--brand-ink)]">
                          {entry.lastUpdate.title}
                          <span className="text-[var(--brand-muted)]">
                            {" · "}
                            {new Date(entry.lastUpdate.at).toLocaleDateString()}
                          </span>
                        </p>
                      )}

                      {entry.replyState === "pending" && (
                        <p className="mt-1 text-xs text-[var(--brand-muted)]">
                          They committed to replying by{" "}
                          {new Date(entry.slaDueAt).toLocaleDateString()}
                        </p>
                      )}
                      {entry.replyState === "breached" && !entry.firstResponseAt && (
                        <p className="mt-1 text-xs text-[var(--destructive)]">
                          They missed the deadline. This counts against their public record.
                        </p>
                      )}
                    </div>

                    <SlaBadge state={entry.replyState} dueAt={entry.slaDueAt} />
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
