import { Link, createFileRoute, getRouteApi, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createRoleFn, listRolesFn } from "@/lib/server/companyFns";
import { roleReadiness } from "@/lib/job/publishRequirements";

export const Route = createFileRoute("/company/$companyId/roles/")({
  loader: async ({ params }) =>
    listRolesFn({ data: { companyId: params.companyId, includeArchived: true } }),
  component: RolesList,
});

const layoutRoute = getRouteApi("/company/$companyId");

type Filter = "open" | "drafts" | "archived";

/**
 * The roles list.
 *
 * Creating asks only for a title and then opens the editor. A long form up front
 * is how listings end up abandoned half-filled, and the editor is where the
 * publish checklist lives anyway.
 */
function RolesList() {
  const roles = Route.useLoaderData();
  const { companyId } = Route.useParams();
  const { publishable, blockedReason } = layoutRoute.useLoaderData();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<Filter>("open");

  const counts = {
    open: roles.filter((r) => r.status === "published").length,
    drafts: roles.filter((r) => r.status === "pending").length,
    archived: roles.filter((r) => r.status === "archived").length,
  };

  const visible = roles.filter((role) =>
    filter === "open"
      ? role.status === "published"
      : filter === "drafts"
        ? role.status === "pending"
        : role.status === "archived",
  );

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);

    try {
      const { jobId } = await createRoleFn({ data: { companyId, title: title.trim() } });
      setTitle("");
      await router.navigate({
        to: "/company/$companyId/roles/$jobId",
        params: { companyId, jobId },
      });
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h2
        className="text-[var(--text-title2)] text-[var(--brand-ink)]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
      >
        Roles
      </h2>

      {!publishable && (
        <Card className="border-[var(--warning)]/40 bg-[var(--warning)]/5 p-4 text-sm text-[var(--brand-ink)]">
          Roles cannot go live yet — {blockedReason}. You can still draft them.
        </Card>
      )}

      <Card className="p-5">
        <form onSubmit={create} className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[260px] flex-1 flex-col gap-1.5">
            <span className="text-sm font-medium text-[var(--brand-ink)]">New role</span>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Senior Backend Engineer"
              maxLength={200}
            />
          </label>
          <Button type="submit" variant="brand" disabled={busy || title.trim().length === 0}>
            {busy ? "Creating…" : "Create draft"}
          </Button>
        </form>
      </Card>

      <div className="flex gap-2">
        {(["open", "drafts", "archived"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={
              filter === value
                ? "rounded-full bg-[var(--brand-primary)] px-3.5 py-1.5 text-sm font-medium text-white"
                : "rounded-full border border-[var(--surface-muted-border)] px-3.5 py-1.5 text-sm text-[var(--brand-muted)] hover:text-[var(--brand-ink)]"
            }
          >
            {value === "open" ? "Live" : value === "drafts" ? "Drafts" : "Archived"} ({counts[value]})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-semibold text-[var(--brand-ink)]">
            {filter === "open"
              ? "No live roles"
              : filter === "drafts"
                ? "No drafts"
                : "Nothing archived"}
          </p>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            {filter === "open"
              ? "Drafts go live once they are complete enough for candidates to judge."
              : "Create one above."}
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((role) => {
            const readiness = roleReadiness(role);

            return (
              <li key={role.id}>
                <Link
                  to="/company/$companyId/roles/$jobId"
                  params={{ companyId, jobId: role.id }}
                >
                  <Card className="flex flex-wrap items-center justify-between gap-4 p-5 transition-colors hover:border-[var(--brand-primary)]/40">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-[var(--brand-ink)]">{role.title}</p>
                        {role.status === "published" && <Badge variant="success">Live</Badge>}
                        {role.status === "pending" &&
                          (readiness.ready ? (
                            <Badge variant="info">Ready to publish</Badge>
                          ) : (
                            <Badge variant="warning">
                              {readiness.missing.length} field
                              {readiness.missing.length === 1 ? "" : "s"} to fill
                            </Badge>
                          ))}
                        {role.status === "archived" && <Badge variant="neutral">Archived</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-[var(--brand-muted)]">
                        {[
                          role.roleFamily?.replace(/_/g, " "),
                          role.seniority,
                          role.remoteType,
                          role.salaryIsPublic && role.salaryMin
                            ? `from $${role.salaryMin.toLocaleString("en-US")}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Nothing filled in yet"}
                      </p>
                    </div>
                    <span className="text-sm text-[var(--brand-muted)]">Edit →</span>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
