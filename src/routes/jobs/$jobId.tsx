import { Link, createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { RoleView } from "@/components/public/RoleView";
import { getPublicRole } from "@/lib/server/publicFns";

export const Route = createFileRoute("/jobs/$jobId")({
  // Public on purpose: candidates read a role before they have an account.
  loader: async ({ params }) => getPublicRole({ data: { jobId: params.jobId } }),
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: `${loaderData.role.title} at ${loaderData.company.name}` },
            {
              name: "description",
              content: `${loaderData.company.name} replies to every applicant within ${
                loaderData.responseRecord.slaResponseDays ?? 7
              } days.`,
            },
          ],
        }
      : {},
  component: PublicRole,
});

function PublicRole() {
  const data = Route.useLoaderData();

  if (!data) {
    // A closed, draft or archived role is indistinguishable from one that never
    // existed — the candidate side must fail closed.
    return (
      <div className="mx-auto max-w-[640px] px-6 py-20">
        <Card className="p-10 text-center">
          <p className="text-[var(--text-title3)] font-semibold text-[var(--brand-ink)]">
            This role is no longer open
          </p>
          <p className="mt-2 text-sm text-[var(--brand-muted)]">
            Roles come down as soon as they close, so nothing here is a dead listing.
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

  return <RoleView data={data} />;
}
