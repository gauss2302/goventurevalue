import { Link, createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireAuthForLoader } from "@/lib/auth/requireAuth";
import { listMyCompanies } from "@/lib/server/companyFns";

export const Route = createFileRoute("/company/")({
  beforeLoad: async ({ location }) => {
    await requireAuthForLoader(location);
  },
  loader: async () => listMyCompanies(),
  component: CompanyList,
});

/**
 * Every company the signed-in person can act for.
 *
 * A list rather than a single dashboard because membership is per company
 * (§6.6) — fractional recruiters and founders who advise elsewhere are normal.
 */
function CompanyList() {
  const companies = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-[900px] px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1
          className="text-[var(--text-title1)] text-[var(--brand-ink)]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
        >
          Your companies
        </h1>
        <Button asChild variant="brand">
          <Link to="/company/new">Add a company</Link>
        </Button>
      </div>

      {companies.length === 0 ? (
        <Card className="mt-8 p-10 text-center">
          <p className="text-[var(--text-title3)] font-semibold text-[var(--brand-ink)]">
            No companies yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--brand-muted)]">
            Add your startup, verify your work email and accept the response commitment.
            Then your roles can go live.
          </p>
          <Button asChild variant="brand" className="mt-6">
            <Link to="/company/new">Add your company</Link>
          </Button>
        </Card>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {companies.map((entry) => (
            <li key={entry.id}>
              <Link to="/company/$companyId" params={{ companyId: entry.id }}>
                <Card className="flex items-center justify-between gap-4 p-5 transition-colors hover:border-[var(--brand-primary)]/40">
                  <div>
                    <p className="font-semibold text-[var(--brand-ink)]">{entry.name}</p>
                    <p className="mt-0.5 text-sm text-[var(--brand-muted)]">
                      You are {entry.role}
                    </p>
                  </div>
                  {entry.publishable ? (
                    <Badge variant="success">Live</Badge>
                  ) : (
                    <Badge variant="warning">Setup incomplete</Badge>
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
