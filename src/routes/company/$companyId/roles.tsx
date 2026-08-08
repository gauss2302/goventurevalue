import { createFileRoute, getRouteApi, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { archiveRoleFn, createRoleFn, listRolesFn, publishRoleFn } from "@/lib/server/companyFns";
import { roleFamilyEnum, seniorityEnum, remoteTypeEnum } from "@/db/schema";

export const Route = createFileRoute("/company/$companyId/roles")({
  loader: async ({ params }) => listRolesFn({ data: { companyId: params.companyId } }),
  component: Roles,
});

const layoutRoute = getRouteApi("/company/$companyId");

function Roles() {
  const roles = Route.useLoaderData();
  const { companyId } = Route.useParams();
  const { publishable, blockedReason } = layoutRoute.useLoaderData();
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const publish = async (jobId: string) => {
    try {
      const outcome = await publishRoleFn({ data: { jobId } });
      if (outcome.published) {
        toast.success("Role is live");
      } else {
        // The gate is the company, not the role — say which one is missing.
        toast.warning("Not published", { description: outcome.reason });
      }
      await router.invalidate();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const archive = async (jobId: string) => {
    try {
      await archiveRoleFn({ data: { jobId } });
      toast.success("Role archived");
      await router.invalidate();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          className="text-[var(--text-title2)] text-[var(--brand-ink)]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
        >
          Roles
        </h2>
        <Button variant="brand" onClick={() => setCreating((open) => !open)}>
          {creating ? "Cancel" : "New role"}
        </Button>
      </div>

      {!publishable && (
        <Card className="border-[var(--warning)]/40 bg-[var(--warning)]/5 p-4 text-sm text-[var(--brand-ink)]">
          Roles cannot go live yet — {blockedReason}. You can still draft them.
        </Card>
      )}

      {creating && (
        <NewRoleForm
          companyId={companyId}
          onDone={async () => {
            setCreating(false);
            await router.invalidate();
          }}
        />
      )}

      {roles.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-semibold text-[var(--brand-ink)]">No roles yet</p>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            Add the first one. Drafts stay private until you publish them.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {roles.map((role) => (
            <li key={role.id}>
              <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[var(--brand-ink)]">{role.title}</p>
                    <Badge
                      variant={
                        role.status === "published"
                          ? "success"
                          : role.status === "archived"
                            ? "neutral"
                            : "info"
                      }
                    >
                      {role.status === "pending" ? "Draft" : role.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-[var(--brand-muted)]">
                    {[role.roleFamily?.replace(/_/g, " "), role.seniority, role.remoteType]
                      .filter(Boolean)
                      .join(" · ") || "No details yet"}
                  </p>
                </div>

                <div className="flex gap-2">
                  {role.status !== "published" && role.status !== "archived" && (
                    <Button size="sm" onClick={() => publish(role.id)}>
                      Publish
                    </Button>
                  )}
                  {role.status !== "archived" && (
                    <Button size="sm" variant="ghost" onClick={() => archive(role.id)}>
                      Archive
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

function NewRoleForm({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [roleFamily, setRoleFamily] = useState<string>("");
  const [seniority, setSeniority] = useState<string>("");
  const [remoteType, setRemoteType] = useState<string>("remote");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);

    try {
      const min = salaryMin ? Number(salaryMin) : null;
      const max = salaryMax ? Number(salaryMax) : null;

      await createRoleFn({
        data: {
          companyId,
          title: title.trim(),
          descriptionMd: description.trim() || null,
          roleFamily: (roleFamily || null) as never,
          seniority: (seniority || null) as never,
          remoteType: (remoteType || null) as never,
          salaryMin: min,
          salaryMax: max,
          // Showing a band is optional, but a band shown must have a number in
          // it — "salary shown" next to nothing is worse than saying nothing.
          salaryIsPublic: min !== null || max !== null,
          salaryCurrency: min !== null || max !== null ? "USD" : null,
        },
      });

      toast.success("Draft created");
      onDone();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[var(--brand-ink)]">Title *</span>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Senior Backend Engineer"
            required
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Function" value={roleFamily} onChange={setRoleFamily}>
            <option value="">Not set</option>
            {roleFamilyEnum.enumValues.map((value) => (
              <option key={value} value={value}>
                {value.replace(/_/g, " ")}
              </option>
            ))}
          </Select>

          <Select label="Level" value={seniority} onChange={setSeniority}>
            <option value="">Not set</option>
            {seniorityEnum.enumValues.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>

          <Select label="Location" value={remoteType} onChange={setRemoteType}>
            {remoteTypeEnum.enumValues.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[var(--brand-ink)]">Salary from, USD</span>
            <Input
              type="number"
              min={0}
              value={salaryMin}
              onChange={(event) => setSalaryMin(event.target.value)}
              placeholder="120000"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[var(--brand-ink)]">Salary to, USD</span>
            <Input
              type="number"
              min={0}
              value={salaryMax}
              onChange={(event) => setSalaryMax(event.target.value)}
              placeholder="160000"
            />
          </label>
        </div>
        <p className="-mt-2 text-xs text-[var(--brand-muted)]">
          Leaving the band empty is fine — it shows as "not disclosed" rather than a guess.
        </p>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[var(--brand-ink)]">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={8}
            className="rounded-[var(--radius-sm)] border border-[var(--surface-muted-border)] bg-[var(--page)] p-3 text-sm text-[var(--brand-ink)] outline-none focus-visible:border-[var(--brand-primary)]"
            placeholder="What the person will own, who they work with, how the team is set up."
          />
        </label>

        <Button
          type="submit"
          variant="brand"
          disabled={busy || title.trim().length === 0}
          className="self-start"
        >
          {busy ? "Saving…" : "Save draft"}
        </Button>
      </form>
    </Card>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[var(--brand-ink)]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-[var(--radius-sm)] border border-[var(--surface-muted-border)] bg-[var(--page)] px-3 text-sm text-[var(--brand-ink)] outline-none focus-visible:border-[var(--brand-primary)]"
      >
        {children}
      </select>
    </label>
  );
}
