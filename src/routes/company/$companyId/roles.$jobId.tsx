import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { remoteTypeEnum, roleFamilyEnum, seniorityEnum } from "@/db/schema";
import {
  MIN_DESCRIPTION_LENGTH,
  ROLE_REQUIREMENT_REASONS,
  roleReadiness,
  type RoleRequirement,
} from "@/lib/job/publishRequirements";
import {
  archiveRoleFn,
  duplicateRoleFn,
  getRoleFn,
  listMembersFn,
  publishRoleFn,
  restoreRoleFn,
  unpublishRoleFn,
  updateRoleFn,
} from "@/lib/server/companyFns";

export const Route = createFileRoute("/company/$companyId/roles/$jobId")({
  loader: async ({ params }) => {
    const [role, members] = await Promise.all([
      getRoleFn({ data: { jobId: params.jobId } }),
      listMembersFn({ data: { companyId: params.companyId } }),
    ]);
    return { ...role, members };
  },
  component: RoleEditor,
});

const REQUIREMENT_LABEL: Record<RoleRequirement, string> = {
  title: "Title",
  description: "Description",
  roleFamily: "Function",
  seniority: "Level",
  remoteType: "Where the work happens",
  location: "Location",
  salaryBand: "Salary band",
};

const toList = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

/**
 * Editing one role.
 *
 * The publish checklist is the centrepiece rather than a validation message at
 * the end: the fields it asks for are what make a role findable and judgeable
 * (§6.2), so a company should see what is missing while writing, not after
 * pressing publish.
 */
function RoleEditor() {
  const { role, readiness: serverReadiness, companyPublishable, companyBlockedReason, members } =
    Route.useLoaderData();
  const { companyId, jobId } = Route.useParams();
  const router = useRouter();

  const [form, setForm] = useState({
    title: role.title,
    descriptionMd: role.descriptionMd ?? "",
    roleFamily: role.roleFamily ?? "",
    seniority: role.seniority ?? "",
    remoteType: role.remoteType ?? "",
    salaryMin: role.salaryMin?.toString() ?? "",
    salaryMax: role.salaryMax?.toString() ?? "",
    salaryIsPublic: role.salaryIsPublic,
    techStack: (role.techStack ?? []).join(", "),
    locations: (role.locations ?? []).join(", "),
    timezones: (role.timezones ?? []).join(", "),
    visaSponsorship: role.visaSponsorship ?? false,
    hiringManagerMemberId: role.hiringManagerMemberId ?? "",
  });
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  // Readiness recomputed from the form so the checklist reacts as you type,
  // rather than only after a save round trip.
  const readiness = roleReadiness({
    title: form.title,
    descriptionMd: form.descriptionMd,
    roleFamily: (form.roleFamily || null) as never,
    seniority: (form.seniority || null) as never,
    remoteType: (form.remoteType || null) as never,
    locations: toList(form.locations),
    salaryIsPublic: form.salaryIsPublic,
    salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
    salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
  });

  const payload = () => ({
    jobId,
    title: form.title.trim(),
    descriptionMd: form.descriptionMd.trim() || null,
    roleFamily: (form.roleFamily || null) as never,
    seniority: (form.seniority || null) as never,
    remoteType: (form.remoteType || null) as never,
    salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
    salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
    salaryCurrency: form.salaryIsPublic ? "USD" : null,
    salaryIsPublic: form.salaryIsPublic,
    techStack: toList(form.techStack),
    locations: toList(form.locations),
    timezones: toList(form.timezones),
    visaSponsorship: form.visaSponsorship,
    hiringManagerMemberId: form.hiringManagerMemberId || null,
  });

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
      await router.invalidate();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      await updateRoleFn({ data: payload() });
      toast.success("Saved");
    });

  const publish = () =>
    run(async () => {
      await updateRoleFn({ data: payload() });
      const outcome = await publishRoleFn({ data: { jobId } });

      if (outcome.published) {
        toast.success("Role is live");
      } else {
        toast.warning("Not published", { description: outcome.reason });
      }
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/company/$companyId/roles"
            params={{ companyId }}
            className="text-sm text-[var(--brand-muted)] hover:text-[var(--brand-ink)]"
          >
            ← Roles
          </Link>
          <h2
            className="text-[var(--text-title2)] text-[var(--brand-ink)]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
          >
            {role.title}
          </h2>
          {role.status === "published" && <Badge variant="success">Live</Badge>}
          {role.status === "pending" && <Badge variant="info">Draft</Badge>}
          {role.status === "archived" && <Badge variant="neutral">Archived</Badge>}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={save}>
            Save
          </Button>

          {role.status === "archived" ? (
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await restoreRoleFn({ data: { jobId } });
                  toast.success("Restored as a draft");
                })
              }
            >
              Restore
            </Button>
          ) : role.status === "published" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await unpublishRoleFn({ data: { jobId } });
                  toast.success("Taken off the board");
                })
              }
            >
              Unpublish
            </Button>
          ) : (
            <Button variant="brand" size="sm" disabled={busy || !readiness.ready} onClick={publish}>
              Publish
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const { jobId: copyId } = await duplicateRoleFn({ data: { jobId } });
                toast.success("Copied as a draft");
                await router.navigate({
                  to: "/company/$companyId/roles/$jobId",
                  params: { companyId, jobId: copyId },
                });
              })
            }
          >
            Duplicate
          </Button>

          {role.status !== "archived" && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await archiveRoleFn({ data: { jobId } });
                  toast.success("Archived");
                })
              }
            >
              Archive
            </Button>
          )}
        </div>
      </div>

      {!companyPublishable && (
        <Card className="border-[var(--warning)]/40 bg-[var(--warning)]/5 p-4 text-sm text-[var(--brand-ink)]">
          Nothing can go live yet — {companyBlockedReason}.
        </Card>
      )}

      <PublishChecklist readiness={readiness} savedReady={serverReadiness.ready} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="flex flex-col gap-5 p-6">
          <Field label="Title" required>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={200} />
          </Field>

          <Field
            label="Description"
            required
            hint={`${form.descriptionMd.trim().length} / ${MIN_DESCRIPTION_LENGTH} characters minimum. What the person will own, who they work with, how the team is set up.`}
          >
            <textarea
              value={form.descriptionMd}
              onChange={(e) => set("descriptionMd", e.target.value)}
              rows={12}
              className="rounded-[var(--radius-sm)] border border-[var(--surface-muted-border)] bg-[var(--page)] p-3 text-sm text-[var(--brand-ink)] outline-none focus-visible:border-[var(--brand-primary)]"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Function" required value={form.roleFamily} onChange={(v) => set("roleFamily", v as never)}>
              <option value="">Not set</option>
              {roleFamilyEnum.enumValues.map((v) => (
                <option key={v} value={v}>
                  {v.replace(/_/g, " ")}
                </option>
              ))}
            </Select>

            <Select label="Level" required value={form.seniority} onChange={(v) => set("seniority", v as never)}>
              <option value="">Not set</option>
              {seniorityEnum.enumValues.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>

            <Select label="Where" required value={form.remoteType} onChange={(v) => set("remoteType", v as never)}>
              <option value="">Not set</option>
              {remoteTypeEnum.enumValues.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>
          </div>

          <Field label="Locations" hint="Comma separated. Required for onsite and hybrid roles.">
            <Input
              value={form.locations}
              onChange={(e) => set("locations", e.target.value)}
              placeholder="Berlin, London"
            />
          </Field>

          <Field label="Timezone overlap" hint="Comma separated, e.g. CET ±3.">
            <Input
              value={form.timezones}
              onChange={(e) => set("timezones", e.target.value)}
              placeholder="CET ±3"
            />
          </Field>

          <Field label="Technologies" hint="Comma separated.">
            <Input
              value={form.techStack}
              onChange={(e) => set("techStack", e.target.value)}
              placeholder="TypeScript, Postgres, Kubernetes"
            />
          </Field>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4 p-6">
            <h3 className="text-sm font-semibold text-[var(--brand-ink)]">Salary</h3>

            <label className="flex items-center gap-2 text-sm text-[var(--brand-ink)]">
              <input
                type="checkbox"
                checked={form.salaryIsPublic}
                onChange={(e) => set("salaryIsPublic", e.target.checked)}
              />
              Show the band to candidates
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="From, USD">
                <Input
                  type="number"
                  min={0}
                  value={form.salaryMin}
                  onChange={(e) => set("salaryMin", e.target.value)}
                />
              </Field>
              <Field label="To, USD">
                <Input
                  type="number"
                  min={0}
                  value={form.salaryMax}
                  onChange={(e) => set("salaryMax", e.target.value)}
                />
              </Field>
            </div>

            <p className="text-xs text-[var(--brand-muted)]">
              {/* Withholding is honest and rendered as such; claiming to show a
                  band while showing nothing is not (§6.4 rule 2). */}
              Leaving this off shows "not disclosed" — never a guessed number.
            </p>

            <label className="flex items-center gap-2 text-sm text-[var(--brand-ink)]">
              <input
                type="checkbox"
                checked={form.visaSponsorship}
                onChange={(e) => set("visaSponsorship", e.target.checked)}
              />
              We sponsor visas
            </label>
          </Card>

          <Card className="flex flex-col gap-3 p-6">
            <h3 className="text-sm font-semibold text-[var(--brand-ink)]">Who answers</h3>
            <p className="text-xs text-[var(--brand-muted)]">
              {/* This is the chain the SLA is addressed through (§6.6). */}
              Applications to this role are assigned to this person, and the reply reminders
              go to them.
            </p>
            <select
              value={form.hiringManagerMemberId}
              onChange={(e) => set("hiringManagerMemberId", e.target.value)}
              className="h-10 rounded-[var(--radius-sm)] border border-[var(--surface-muted-border)] bg-[var(--page)] px-3 text-sm text-[var(--brand-ink)]"
            >
              <option value="">Whoever is the company reminder contact</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.user.name} ({member.role})
                </option>
              ))}
            </select>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PublishChecklist({
  readiness,
  savedReady,
}: {
  readiness: ReturnType<typeof roleReadiness>;
  savedReady: boolean;
}) {
  if (readiness.ready) {
    return (
      <Card className="border-[var(--success)]/40 bg-[var(--success)]/5 p-4">
        <p className="text-sm font-medium text-[var(--brand-ink)]">
          Complete enough for candidates to judge.
          {!savedReady && " Save or publish to apply your changes."}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--brand-ink)]">Before this can go live</h3>
        <span className="text-xs text-[var(--brand-muted)]">
          {Math.round(readiness.completeness * 100)}% complete
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="h-full rounded-full bg-[var(--brand-primary)] transition-all"
          style={{ width: `${Math.round(readiness.completeness * 100)}%` }}
        />
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {readiness.missing.map((requirement) => (
          <li key={requirement} className="flex gap-2 text-sm">
            <span className="text-[var(--warning)]">•</span>
            <span>
              <strong className="text-[var(--brand-ink)]">
                {REQUIREMENT_LABEL[requirement]}
              </strong>
              <span className="text-[var(--brand-muted)]">
                {" "}
                — {ROLE_REQUIREMENT_REASONS[requirement]}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[var(--brand-ink)]">
        {label}
        {required && <span className="text-[var(--destructive)]"> *</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-[var(--brand-muted)]">{hint}</span>}
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  required,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[var(--brand-ink)]">
        {label}
        {required && <span className="text-[var(--destructive)]"> *</span>}
      </span>
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
