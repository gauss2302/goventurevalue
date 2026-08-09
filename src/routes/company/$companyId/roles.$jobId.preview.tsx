import { Link, createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { RoleView } from "@/components/public/RoleView";
import { previewRole } from "@/lib/server/publicFns";

export const Route = createFileRoute("/company/$companyId/roles/$jobId/preview")({
  loader: async ({ params }) => previewRole({ data: { jobId: params.jobId } }),
  component: RolePreview,
});

/**
 * The company looking at its own role exactly as a candidate will.
 *
 * Renders the same component the public page uses, with the same builders behind
 * it. The only difference is a banner saying so and no apply button, because the
 * company is not applying to itself.
 */
function RolePreview() {
  const data = Route.useLoaderData();
  const { companyId, jobId } = Route.useParams();

  if (!data) {
    return (
      <Card className="p-10 text-center text-sm text-[var(--brand-muted)]">Role not found.</Card>
    );
  }

  return (
    <div>
      <div className="mx-auto max-w-[900px] px-6 pt-6">
        <Link
          to="/company/$companyId/roles/$jobId"
          params={{ companyId, jobId }}
          className="text-sm text-[var(--brand-muted)] hover:text-[var(--brand-ink)]"
        >
          ← Back to editing
        </Link>
      </div>
      <RoleView data={data} />
    </div>
  );
}
