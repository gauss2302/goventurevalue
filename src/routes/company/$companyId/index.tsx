import { Link, createFileRoute, getRouteApi, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SLA_RESPONSE_DAYS } from "@/config/brand";
import { acceptSlaFn, verifyDomainFn } from "@/lib/server/companyFns";

export const Route = createFileRoute("/company/$companyId/")({
  component: CompanyOverview,
});

/** The layout route already loaded the overview; reuse it instead of refetching. */
const layoutRoute = getRouteApi("/company/$companyId");

/**
 * Overview: the onboarding checklist until the company is live, the response
 * record afterwards.
 *
 * Both gates are shown together rather than as a wizard, so a founder can see
 * exactly what stands between them and publishing instead of discovering the
 * second step after finishing the first.
 */
function CompanyOverview() {
  const { company, publishable, blockedReason, dashboard, role } = layoutRoute.useLoaderData();

  return (
    <div className="flex flex-col gap-6">
      {!publishable && (
        <OnboardingChecklist company={company} role={role} blockedReason={blockedReason} />
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Awaiting reply" value={dashboard.awaitingReply} />
        <Stat
          label="Due within 24h"
          value={dashboard.dueWithin24h}
          tone={dashboard.dueWithin24h > 0 ? "warning" : undefined}
        />
        <Stat
          label="Overdue"
          value={dashboard.overdue}
          tone={dashboard.overdue > 0 ? "danger" : undefined}
        />
        <Stat
          label="Response rate"
          value={
            // Null, not 0%: a company with nothing resolved has no response
            // rate, and "0%" would be a false accusation (§6.4 rule 2).
            dashboard.responseRate === null
              ? "No data yet"
              : `${Math.round(dashboard.responseRate * 100)}%`
          }
        />
      </section>

      <Card className="p-6">
        <h2 className="text-[var(--text-title3)] font-semibold text-[var(--brand-ink)]">
          Your response record
        </h2>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          Candidates see this on your company page. It is what makes them apply.
        </p>

        <dl className="mt-5 grid gap-5 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-[var(--brand-muted)]">
              Answered in time
            </dt>
            <dd className="mt-1 text-[var(--text-title2)] font-semibold text-[var(--brand-ink)]">
              {dashboard.answered}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-[var(--brand-muted)]">Missed</dt>
            <dd className="mt-1 text-[var(--text-title2)] font-semibold text-[var(--brand-ink)]">
              {dashboard.breached}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-[var(--brand-muted)]">
              Median time to first reply
            </dt>
            <dd className="mt-1 text-[var(--text-title2)] font-semibold text-[var(--brand-ink)]">
              {dashboard.medianResponseHours === null
                ? "No data yet"
                : `${dashboard.medianResponseHours}h`}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="text-[var(--text-title3)] font-semibold text-[var(--brand-ink)]">
            Applications
          </h2>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            Sorted by how soon each reply is due, not by when it arrived.
          </p>
        </div>
        <Button asChild variant="brand">
          <Link to="/company/$companyId/applications" params={{ companyId: company.id }}>
            Open inbox
          </Link>
        </Button>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "warning" | "danger";
}) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-wide text-[var(--brand-muted)]">{label}</p>
      <p
        className="mt-2 text-[var(--text-title1)] font-semibold"
        style={{
          color:
            tone === "danger"
              ? "var(--destructive)"
              : tone === "warning"
                ? "var(--warning)"
                : "var(--brand-ink)",
        }}
      >
        {value}
      </p>
    </Card>
  );
}

type CompanySummary = {
  id: string;
  name: string;
  domain: string | null;
  domainVerifiedAt: Date | string | null;
  slaAcceptedAt: Date | string | null;
  slaResponseDays: number | null;
};

function OnboardingChecklist({
  company,
  role,
  blockedReason,
}: {
  company: CompanySummary;
  role: string;
  blockedReason: string | null;
}) {
  const router = useRouter();
  const [workEmail, setWorkEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const domainDone = Boolean(company.domainVerifiedAt);
  const slaDone = Boolean(company.slaAcceptedAt);

  const verify = async () => {
    setBusy(true);
    try {
      const result = await verifyDomainFn({ data: { companyId: company.id, workEmail } });
      if (result.state === "verified") {
        toast.success("Domain verified");
      } else {
        // Not a failure: a free-mail address simply cannot prove ownership, so a
        // human looks at it rather than the founder being turned away (§3).
        toast.info("Sent for manual review", { description: result.reason });
      }
      await router.invalidate();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const accept = async () => {
    setBusy(true);
    try {
      const result = await acceptSlaFn({ data: { companyId: company.id } });
      toast.success(`Committed to replying within ${result.responseDays} days`);
      await router.invalidate();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-[var(--warning)]/40 bg-[var(--warning)]/5 p-6">
      <div className="flex items-center gap-3">
        <h2 className="text-[var(--text-title3)] font-semibold text-[var(--brand-ink)]">
          Two steps before your roles can go live
        </h2>
        {blockedReason && <Badge variant="warning">{blockedReason}</Badge>}
      </div>

      <ol className="mt-5 flex flex-col gap-5">
        <li className="flex flex-col gap-3 border-t border-[var(--surface-muted-border)] pt-5 first:border-0 first:pt-0">
          <div className="flex items-center gap-2">
            <Badge variant={domainDone ? "success" : "neutral"}>
              {domainDone ? "Done" : "Step 1"}
            </Badge>
            <span className="font-medium text-[var(--brand-ink)]">
              Verify you work at {company.domain ?? "this company"}
            </span>
          </div>

          {!domainDone && (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="email"
                value={workEmail}
                placeholder={company.domain ? `you@${company.domain}` : "you@company.com"}
                onChange={(event) => setWorkEmail(event.target.value)}
                className="max-w-xs"
              />
              <Button onClick={verify} disabled={busy || workEmail.length === 0}>
                Verify
              </Button>
              <span className="text-xs text-[var(--brand-muted)]">
                Using a personal address is fine — we will review it by hand.
              </span>
            </div>
          )}
        </li>

        <li className="flex flex-col gap-3 border-t border-[var(--surface-muted-border)] pt-5">
          <div className="flex items-center gap-2">
            <Badge variant={slaDone ? "success" : "neutral"}>
              {slaDone ? "Done" : "Step 2"}
            </Badge>
            <span className="font-medium text-[var(--brand-ink)]">
              Accept the response commitment
            </span>
          </div>

          {slaDone ? (
            <p className="text-sm text-[var(--brand-muted)]">
              You reply to every applicant within {company.slaResponseDays} days.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="max-w-2xl text-sm text-[var(--brand-muted)]">
                Every company here replies to every applicant within{" "}
                <strong className="text-[var(--brand-ink)]">
                  {SLA_RESPONSE_DAYS} days
                </strong>
                . A rejection counts — silence does not. We publish your actual response
                rate on your page, and candidates only get {""}
                a handful of applications a week, so the volume stays answerable.
              </p>
              {role === "owner" ? (
                <Button variant="brand" onClick={accept} disabled={busy} className="self-start">
                  Accept and continue
                </Button>
              ) : (
                // Owner-only: it binds the whole company and opens publication (§6.6).
                <p className="text-sm text-[var(--brand-muted)]">
                  Only an owner can accept this. Ask them to finish setup.
                </p>
              )}
            </div>
          )}
        </li>
      </ol>
    </Card>
  );
}
