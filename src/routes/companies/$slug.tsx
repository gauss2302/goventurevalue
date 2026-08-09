import { Link, createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CompanySignalPanel } from "@/components/public/CompanySignalPanel";
import { ResponsePromise } from "@/components/public/ResponsePromise";
import { formatSalaryBand } from "@/lib/company/publicProfile";
import { getPublicCompany } from "@/lib/server/publicFns";

export const Route = createFileRoute("/companies/$slug")({
  loader: async ({ params }) => getPublicCompany({ data: { slug: params.slug } }),
  head: ({ loaderData }) =>
    loaderData ? { meta: [{ title: `${loaderData.company.name} — open roles` }] } : {},
  component: PublicCompany,
});

/**
 * The company profile a candidate reads before deciding to apply.
 *
 * Leads with the response record and the company signals rather than with a
 * description, because those are the two things a candidate cannot find
 * elsewhere and both are what the product is for (§1.4).
 */
function PublicCompany() {
  const data = Route.useLoaderData();

  if (!data) {
    return (
      <div className="mx-auto max-w-[640px] px-6 py-20">
        <Card className="p-10 text-center">
          <p className="text-[var(--text-title3)] font-semibold text-[var(--brand-ink)]">
            Company not found
          </p>
          <Link
            to="/"
            className="mt-6 inline-block text-sm font-medium text-[var(--brand-primary)]"
          >
            Back to the start
          </Link>
        </Card>
      </div>
    );
  }

  const { company, signals, responseRecord, roles } = data;

  return (
    <div className="mx-auto max-w-[900px] px-6 py-10">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1
            className="text-[var(--brand-ink)]"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              lineHeight: 1.1,
            }}
          >
            {company.name}
          </h1>
          {company.stage !== "unknown" && (
            <Badge variant="brand">{company.stage.replace(/_/g, " ")}</Badge>
          )}
        </div>

        <p className="text-sm text-[var(--brand-muted)]">
          {[
            company.hqLocation,
            company.foundedYear ? `founded ${company.foundedYear}` : null,
            company.website,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {company.description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--brand-ink)]">
            {company.description}
          </p>
        )}
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="flex flex-col gap-3">
          <h2 className="text-[var(--text-title3)] font-semibold text-[var(--brand-ink)]">
            Open roles ({roles.length})
          </h2>

          {roles.length === 0 ? (
            <Card className="p-8 text-center text-sm text-[var(--brand-muted)]">
              No open roles right now.
            </Card>
          ) : (
            <ul className="flex flex-col gap-3">
              {roles.map((role) => (
                <li key={role.id}>
                  <Link to="/jobs/$jobId" params={{ jobId: role.id }}>
                    <Card className="p-5 transition-colors hover:border-[var(--brand-primary)]/40">
                      <p className="font-semibold text-[var(--brand-ink)]">{role.title}</p>
                      <p className="mt-1 text-sm text-[var(--brand-muted)]">
                        {[
                          role.seniority,
                          role.roleFamily?.replace(/_/g, " "),
                          role.remoteType,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p className="mt-2 text-sm font-medium text-[var(--brand-ink)]">
                        {formatSalaryBand(role)}
                      </p>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="flex flex-col gap-6">
          <ResponsePromise record={responseRecord} companyName={company.name} />
          <CompanySignalPanel signals={signals} companyName={company.name} />
        </aside>
      </div>
    </div>
  );
}
