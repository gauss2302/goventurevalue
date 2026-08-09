import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SlaBadge } from "@/components/company/SlaBadge";
import { requireAuthForLoader } from "@/lib/auth/requireAuth";
import {
  getMyQuota,
  listMyApplicationsFn,
  withdrawFn,
} from "@/lib/server/candidateFns";

export const Route = createFileRoute("/applications")({
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
 * Shows the deadline the company is working to, not a vague "submitted". The
 * promise is made to the candidate, so the candidate should be able to see it
 * being kept or missed (§3.2).
 */
function MyApplications() {
  const { applications, quota } = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const withdraw = async (applicationId: string) => {
    setBusy(true);
    try {
      await withdrawFn({ data: { applicationId } });
      // Withdrawing releases the company rather than counting against it (§6.6).
      toast.success("Withdrawn — this no longer counts against the company");
      await router.invalidate();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[860px] px-6 py-10">
      <h1
        className="text-[var(--text-title1)] text-[var(--brand-ink)]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
      >
        Your applications
      </h1>

      <Card className="mt-6 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="font-semibold text-[var(--brand-ink)]">
            {quota.remaining} of {quota.limit} applications left this week
          </p>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            {/* The cap is what makes the reply promise keepable, so it is
                explained rather than presented as a restriction (§3.2). */}
            The limit is what keeps companies able to answer everyone. It comes back on{" "}
            {quota.resetsAt.toLocaleDateString(undefined, { weekday: "long" })}.
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
              <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to="/jobs/$jobId"
                      params={{ jobId: entry.jobId }}
                      className="font-semibold text-[var(--brand-ink)] hover:text-[var(--brand-primary)]"
                    >
                      {entry.jobTitle}
                    </Link>
                    <Badge variant="neutral">{entry.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-[var(--brand-muted)]">
                    {entry.companyName} · applied{" "}
                    {new Date(entry.appliedAt).toLocaleDateString()}
                  </p>
                  {entry.slaState === "pending" && (
                    <p className="mt-1 text-xs text-[var(--brand-muted)]">
                      They committed to replying by{" "}
                      {new Date(entry.slaDueAt).toLocaleDateString()}
                    </p>
                  )}
                  {entry.slaState === "breached" && !entry.firstResponseAt && (
                    <p className="mt-1 text-xs text-[var(--destructive)]">
                      They missed the deadline. This counts against their public record.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <SlaBadge state={entry.slaState} dueAt={entry.slaDueAt} />
                  {entry.slaState !== "cancelled" && entry.status !== "withdrawn" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => withdraw(entry.id)}
                    >
                      Withdraw
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
