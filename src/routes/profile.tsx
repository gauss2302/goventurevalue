import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  remoteTypeEnum,
  roleFamilyEnum,
  seniorityEnum,
  startupStageEnum,
} from "@/db/schema";
import { requireAuthForLoader } from "@/lib/auth/requireAuth";
import { REQUIREMENT_REASONS, type Requirement } from "@/lib/candidate/onboarding";
import {
  addExperienceFn,
  getMyProfile,
  removeExperienceFn,
  saveProfileFn,
} from "@/lib/server/candidateFns";

export const Route = createFileRoute("/profile")({
  beforeLoad: async ({ location }) => {
    await requireAuthForLoader(location);
  },
  loader: async () => getMyProfile(),
  component: Profile,
});

const REQUIREMENT_LABEL: Record<Requirement, string> = {
  roleFamilies: "What you do",
  seniority: "Your level",
  trajectory: "Where you have worked",
  timezone: "Your timezone",
  openTo: "Remote, hybrid or onsite",
};

const toList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

/**
 * The candidate profile.
 *
 * Every field here earns its place: it either feeds a hard filter or the match
 * (docs/PRODUCT_PLAN.md §6.2). Asking for anything else would be asking people
 * to type for our benefit rather than theirs.
 */
function Profile() {
  const { profile, experience, status } = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    headline: profile?.headline ?? "",
    yearsExperience: profile?.yearsExperience?.toString() ?? "",
    roleFamilies: profile?.roleFamilies ?? [],
    seniority: profile?.seniority ?? "",
    techStack: (profile?.techStack ?? []).join(", "),
    timezone: profile?.timezone ?? "",
    openTo: profile?.openTo ?? "",
    needsVisa: profile?.needsVisa === null || profile?.needsVisa === undefined
      ? ""
      : profile.needsVisa
        ? "yes"
        : "no",
    salaryExpectationMin: profile?.salaryExpectationMin?.toString() ?? "",
    preferredStages: profile?.preferredStages ?? [],
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const toggle = <T extends string>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const save = async () => {
    setBusy(true);
    try {
      await saveProfileFn({
        data: {
          headline: form.headline.trim() || null,
          yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : null,
          roleFamilies: form.roleFamilies as never,
          seniority: (form.seniority || null) as never,
          techStack: toList(form.techStack),
          timezone: form.timezone.trim() || null,
          openTo: (form.openTo || null) as never,
          // Three-state: "not answered" must not become "no" (§6.4 rule 2).
          needsVisa: form.needsVisa === "" ? null : form.needsVisa === "yes",
          salaryExpectationMin: form.salaryExpectationMin
            ? Number(form.salaryExpectationMin)
            : null,
          preferredStages: form.preferredStages as never,
        },
      });
      toast.success("Profile saved");
      await router.invalidate();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[860px] px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1
          className="text-[var(--text-title1)] text-[var(--brand-ink)]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
        >
          Your profile
        </h1>
        <Button variant="brand" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>

      {status.canApply ? (
        <Card className="mt-6 border-[var(--success)]/40 bg-[var(--success)]/5 p-4 text-sm text-[var(--brand-ink)]">
          Your profile is complete. You can apply to roles that match it.
        </Card>
      ) : (
        <Card className="mt-6 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[var(--brand-ink)]">
              Before you can apply
            </h2>
            <span className="text-xs text-[var(--brand-muted)]">
              {Math.round(status.completeness * 100)}% complete
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div
              className="h-full rounded-full bg-[var(--brand-primary)] transition-all"
              style={{ width: `${Math.round(status.completeness * 100)}%` }}
            />
          </div>
          <ul className="mt-4 flex flex-col gap-2">
            {status.missing.map((requirement) => (
              <li key={requirement} className="flex gap-2 text-sm">
                <span className="text-[var(--warning)]">•</span>
                <span>
                  <strong className="text-[var(--brand-ink)]">
                    {REQUIREMENT_LABEL[requirement]}
                  </strong>
                  <span className="text-[var(--brand-muted)]">
                    {" "}
                    — {REQUIREMENT_REASONS[requirement]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-6 flex flex-col gap-5 p-6">
        <h2 className="text-sm font-semibold text-[var(--brand-ink)]">About you</h2>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[var(--brand-ink)]">Headline</span>
          <Input
            value={form.headline}
            onChange={(e) => set("headline", e.target.value)}
            placeholder="Senior backend engineer, early-stage teams"
          />
        </label>

        <div>
          <span className="text-sm font-medium text-[var(--brand-ink)]">
            What you do <span className="text-[var(--destructive)]">*</span>
          </span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {roleFamilyEnum.enumValues.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => set("roleFamilies", toggle(form.roleFamilies, value))}
                className={
                  form.roleFamilies.includes(value)
                    ? "rounded-full bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-medium text-white"
                    : "rounded-full border border-[var(--surface-muted-border)] px-3 py-1.5 text-xs text-[var(--brand-muted)] hover:text-[var(--brand-ink)]"
                }
              >
                {value.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label="Your level"
            required
            value={form.seniority}
            onChange={(v) => set("seniority", v as never)}
          >
            <option value="">Not set</option>
            {seniorityEnum.enumValues.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[var(--brand-ink)]">Years of experience</span>
            <Input
              type="number"
              min={0}
              value={form.yearsExperience}
              onChange={(e) => set("yearsExperience", e.target.value)}
            />
          </label>

          <Select
            label="Open to"
            required
            value={form.openTo}
            onChange={(v) => set("openTo", v as never)}
          >
            <option value="">Not set</option>
            {remoteTypeEnum.enumValues.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[var(--brand-ink)]">
              Timezone <span className="text-[var(--destructive)]">*</span>
            </span>
            <Input
              value={form.timezone}
              onChange={(e) => set("timezone", e.target.value)}
              placeholder="Europe/Berlin"
            />
          </label>

          <Select
            label="Need visa sponsorship"
            value={form.needsVisa}
            onChange={(v) => set("needsVisa", v)}
          >
            <option value="">Not stated</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[var(--brand-ink)]">
              Minimum salary, USD
            </span>
            <Input
              type="number"
              min={0}
              value={form.salaryExpectationMin}
              onChange={(e) => set("salaryExpectationMin", e.target.value)}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[var(--brand-ink)]">Technologies</span>
          <Input
            value={form.techStack}
            onChange={(e) => set("techStack", e.target.value)}
            placeholder="TypeScript, Postgres, Kubernetes"
          />
        </label>

        <div>
          <span className="text-sm font-medium text-[var(--brand-ink)]">Stages you prefer</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {startupStageEnum.enumValues
              .filter((value) => value !== "unknown")
              .map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("preferredStages", toggle(form.preferredStages, value))}
                  className={
                    form.preferredStages.includes(value)
                      ? "rounded-full bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-medium text-white"
                      : "rounded-full border border-[var(--surface-muted-border)] px-3 py-1.5 text-xs text-[var(--brand-muted)] hover:text-[var(--brand-ink)]"
                  }
                >
                  {value.replace(/_/g, " ")}
                </button>
              ))}
          </div>
        </div>
      </Card>

      <ExperienceSection experience={experience} busy={busy} setBusy={setBusy} />
    </div>
  );
}

function ExperienceSection({
  experience,
  busy,
  setBusy,
}: {
  experience: Array<{
    id: string;
    companyName: string;
    title: string;
    companyStageAtJoin: string | null;
    teamSizeAtJoin: number | null;
    wasFirstInFunction: boolean | null;
    confirmedAt: Date | string | null;
  }>;
  busy: boolean;
  setBusy: (value: boolean) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [entry, setEntry] = useState({
    companyName: "",
    title: "",
    companyStageAtJoin: "",
    teamSizeAtJoin: "",
    wasFirstInFunction: false,
  });

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await addExperienceFn({
        data: {
          companyName: entry.companyName.trim(),
          title: entry.title.trim(),
          companyStageAtJoin: (entry.companyStageAtJoin || null) as never,
          teamSizeAtJoin: entry.teamSizeAtJoin ? Number(entry.teamSizeAtJoin) : null,
          wasFirstInFunction: entry.wasFirstInFunction ? true : null,
        },
      });
      setEntry({
        companyName: "",
        title: "",
        companyStageAtJoin: "",
        teamSizeAtJoin: "",
        wasFirstInFunction: false,
      });
      setOpen(false);
      toast.success("Added");
      await router.invalidate();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await removeExperienceFn({ data: { experienceId: id } });
      await router.invalidate();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--brand-ink)]">
            Where you have worked <span className="text-[var(--destructive)]">*</span>
          </h2>
          <p className="mt-1 text-xs text-[var(--brand-muted)]">
            {/* The trajectory is what matching reasons about — a skill list
                collapses into the tag matching the product argues against. */}
            Stage and team size at joining matter more than titles. They are what tells a
            company you have done this kind of work before.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen((value) => !value)}>
          {open ? "Cancel" : "Add a role"}
        </Button>
      </div>

      {open && (
        <form onSubmit={add} className="mt-5 flex flex-col gap-4 border-t border-[var(--surface-muted-border)] pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--brand-ink)]">Company</span>
              <Input
                value={entry.companyName}
                onChange={(e) => setEntry({ ...entry, companyName: e.target.value })}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--brand-ink)]">Title</span>
              <Input
                value={entry.title}
                onChange={(e) => setEntry({ ...entry, title: e.target.value })}
                required
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Stage when you joined"
              value={entry.companyStageAtJoin}
              onChange={(v) => setEntry({ ...entry, companyStageAtJoin: v })}
            >
              <option value="">Not sure</option>
              {startupStageEnum.enumValues
                .filter((value) => value !== "unknown")
                .map((v) => (
                  <option key={v} value={v}>
                    {v.replace(/_/g, " ")}
                  </option>
                ))}
            </Select>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--brand-ink)]">
                Team size when you joined
              </span>
              <Input
                type="number"
                min={1}
                value={entry.teamSizeAtJoin}
                onChange={(e) => setEntry({ ...entry, teamSizeAtJoin: e.target.value })}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--brand-ink)]">
            <input
              type="checkbox"
              checked={entry.wasFirstInFunction}
              onChange={(e) => setEntry({ ...entry, wasFirstInFunction: e.target.checked })}
            />
            I was the first person in this function
          </label>

          <Button type="submit" variant="brand" disabled={busy} className="self-start">
            Add
          </Button>
        </form>
      )}

      {experience.length === 0 ? (
        <p className="mt-5 text-sm text-[var(--brand-muted)]">Nothing added yet.</p>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {experience.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--surface-muted-border)] pt-3"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-[var(--brand-ink)]">
                    {item.title} at {item.companyName}
                  </p>
                  {!item.confirmedAt && <Badge variant="warning">From your résumé — confirm</Badge>}
                  {item.wasFirstInFunction && <Badge variant="brand">First in function</Badge>}
                </div>
                <p className="mt-0.5 text-sm text-[var(--brand-muted)]">
                  {[
                    item.companyStageAtJoin?.replace(/_/g, " "),
                    item.teamSizeAtJoin ? `team of ${item.teamSizeAtJoin}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "No stage or team size given"}
                </p>
              </div>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => remove(item.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
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
