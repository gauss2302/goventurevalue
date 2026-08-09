import { Link } from "@tanstack/react-router";
import Markdown from "react-markdown";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ApplyPanel, type ApplyState } from "@/components/public/ApplyPanel";
import { CompanySignalPanel } from "@/components/public/CompanySignalPanel";
import { ResponsePromise } from "@/components/public/ResponsePromise";
import { formatSalaryBand } from "@/lib/company/publicProfile";
import type { RoleView as RoleViewData } from "@/lib/server/publicFns";

/**
 * One role, as a candidate sees it.
 *
 * Used by the public page and by the company's own preview — the same component,
 * on purpose. Two renderers would drift, and a preview that drifts is a preview
 * that lies about what candidates will read.
 */
export function RoleView({
  data,
  applyState,
}: {
  data: RoleViewData;
  applyState?: ApplyState;
}) {
  const { role, company, signals, responseRecord, preview } = data;

  const facts = [
    role.seniority,
    role.roleFamily?.replace(/_/g, " "),
    role.remoteType,
    role.locations?.length ? role.locations.join(", ") : null,
    role.timezones?.length ? `overlap ${role.timezones.join(", ")}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-[900px] px-6 py-10">
      {preview && (
        <Card className="mb-6 border-[var(--info)]/40 bg-[var(--info)]/5 p-4 text-sm text-[var(--brand-ink)]">
          Preview — this is exactly what a candidate sees. Nothing here is styled or
          worded differently on the public page.
        </Card>
      )}

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--brand-muted)]">
          <Link
            to="/companies/$slug"
            params={{ slug: company.slug }}
            className="font-medium text-[var(--brand-ink)] hover:text-[var(--brand-primary)]"
          >
            {company.name}
          </Link>
          {company.stage !== "unknown" && (
            <Badge variant="brand">{company.stage.replace(/_/g, " ")}</Badge>
          )}
          {company.hqLocation && <span>· {company.hqLocation}</span>}
        </div>

        <h1
          className="text-[var(--brand-ink)]"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            lineHeight: 1.1,
          }}
        >
          {role.title}
        </h1>

        {facts.length > 0 && (
          <p className="text-sm text-[var(--brand-muted)]">{facts.join(" · ")}</p>
        )}
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <dl className="grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--brand-muted)]">
                  Salary
                </dt>
                <dd className="mt-1 text-[var(--text-title3)] font-semibold text-[var(--brand-ink)]">
                  {/* A withheld band says so. We never widen or infer one (§6.4). */}
                  {formatSalaryBand(role)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--brand-muted)]">
                  Visa sponsorship
                </dt>
                <dd className="mt-1 text-[var(--text-title3)] font-semibold text-[var(--brand-ink)]">
                  {role.visaSponsorship === null
                    ? "Not stated"
                    : role.visaSponsorship
                      ? "Yes"
                      : "No"}
                </dd>
              </div>
            </dl>

            {role.techStack && role.techStack.length > 0 && (
              <div className="mt-6">
                <p className="text-xs uppercase tracking-wide text-[var(--brand-muted)]">
                  Technologies
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {role.techStack.map((tech) => (
                    <li key={tech}>
                      <Badge variant="neutral">{tech}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-[var(--text-title3)] font-semibold text-[var(--brand-ink)]">
              About the role
            </h2>
            <div className="prose-sm mt-4 flex flex-col gap-3 text-sm leading-relaxed text-[var(--brand-ink)]">
              {role.descriptionMd ? (
                <Markdown>{role.descriptionMd}</Markdown>
              ) : (
                <p className="italic text-[var(--brand-muted)]">No description provided.</p>
              )}
            </div>
          </Card>

          {company.description && (
            <Card className="p-6">
              <h2 className="text-[var(--text-title3)] font-semibold text-[var(--brand-ink)]">
                About {company.name}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--brand-ink)]">
                {company.description}
              </p>
            </Card>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          <ResponsePromise record={responseRecord} companyName={company.name} />

          <Card className="p-6">
            <h2 className="text-sm font-semibold text-[var(--brand-ink)]">This role</h2>
            <dl className="mt-4 flex flex-col gap-1">
              <dt className="text-xs uppercase tracking-wide text-[var(--brand-muted)]">
                Last checked
              </dt>
              <dd className="text-[var(--text-title3)] font-semibold text-[var(--brand-ink)]">
                {/* A date, not "posted recently" (§1.4 ②). */}
                {new Date(role.lastVerifiedAt).toLocaleDateString()}
              </dd>
            </dl>
            <p className="mt-3 text-xs text-[var(--brand-muted)]">
              Roles are re-checked daily and archived as soon as they close.
            </p>
          </Card>

          <CompanySignalPanel signals={signals} companyName={company.name} />

          {!preview && applyState && (
            <ApplyPanel
              jobId={role.id}
              companyName={company.name}
              slaResponseDays={responseRecord.slaResponseDays ?? 7}
              apply={applyState}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
