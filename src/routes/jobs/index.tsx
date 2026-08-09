import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { remoteTypeEnum, roleFamilyEnum } from "@/db/schema";
import { formatSalaryBand } from "@/lib/company/publicProfile";
import { searchRolesFn } from "@/lib/server/candidateFns";

export const Route = createFileRoute("/jobs/")({
  // Public: a visitor should see what the board holds before signing up.
  loader: async () => searchRolesFn({ data: {} }),
  component: JobsFeed,
});

/**
 * The candidate feed.
 *
 * Every card leads with why it surfaced and how well the company replies. Both
 * are deliberate: an unexplained recommendation is one nobody trusts (§1.4 ③),
 * and with eight applications a week the response record is the most useful
 * thing a candidate can know before spending one (§3.2).
 */
function JobsFeed() {
  const roles = Route.useLoaderData();
  const [family, setFamily] = useState<string>("");
  const [remote, setRemote] = useState<string>("");

  const visible = roles.filter(
    (role) =>
      (!family || role.roleFamily === family) && (!remote || role.remoteType === remote),
  );

  return (
    <div className="mx-auto max-w-[900px] px-6 py-10">
      <h1
        className="text-[var(--text-title1)] text-[var(--brand-ink)]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
      >
        Open roles
      </h1>
      <p className="mt-2 text-sm text-[var(--brand-muted)]">
        Every company here has committed to replying. Roles come down as soon as they close.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <select
          value={family}
          onChange={(event) => setFamily(event.target.value)}
          className="h-9 rounded-[var(--radius-sm)] border border-[var(--surface-muted-border)] bg-[var(--page)] px-3 text-sm text-[var(--brand-ink)]"
        >
          <option value="">Any function</option>
          {roleFamilyEnum.enumValues.map((value) => (
            <option key={value} value={value}>
              {value.replace(/_/g, " ")}
            </option>
          ))}
        </select>

        <select
          value={remote}
          onChange={(event) => setRemote(event.target.value)}
          className="h-9 rounded-[var(--radius-sm)] border border-[var(--surface-muted-border)] bg-[var(--page)] px-3 text-sm text-[var(--brand-ink)]"
        >
          <option value="">Anywhere</option>
          {remoteTypeEnum.enumValues.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <Card className="mt-6 p-10 text-center">
          <p className="font-semibold text-[var(--brand-ink)]">Nothing matches yet</p>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            We would rather show you an empty list than roles that do not fit.
          </p>
        </Card>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {visible.map((role) => (
            <li key={role.id}>
              <Link to="/jobs/$jobId" params={{ jobId: role.id }}>
                <Card className="p-5 transition-colors hover:border-[var(--brand-primary)]/40">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-[var(--brand-ink)]">{role.title}</p>
                        {role.alreadyApplied && <Badge variant="neutral">Applied</Badge>}
                      </div>
                      <p className="mt-0.5 text-sm text-[var(--brand-muted)]">
                        {role.companyName}
                        {role.companyStage !== "unknown" && ` · ${role.companyStage.replace(/_/g, " ")}`}
                        {role.seniority && ` · ${role.seniority}`}
                        {role.remoteType && ` · ${role.remoteType}`}
                      </p>
                      <p className="mt-2 text-sm font-medium text-[var(--brand-ink)]">
                        {formatSalaryBand(role)}
                      </p>
                    </div>

                    <div className="text-right">
                      {role.responseRate === null ? (
                        // Not "0%": a company with nothing measured has no
                        // record, and zero would be an accusation (§6.4 rule 2).
                        <span className="text-xs italic text-[var(--brand-muted)]">
                          No reply record yet
                        </span>
                      ) : (
                        <Badge variant={role.responseRate >= 0.8 ? "success" : "warning"}>
                          {Math.round(role.responseRate * 100)}% reply rate
                        </Badge>
                      )}
                      <p className="mt-1 text-xs text-[var(--brand-muted)]">
                        replies within {role.slaResponseDays ?? 7} days
                      </p>
                    </div>
                  </div>

                  {role.reasons.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--surface-muted-border)] pt-3">
                      {role.reasons.map((reason) => (
                        <li key={reason.kind}>
                          <Badge variant="info">{reason.text}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
