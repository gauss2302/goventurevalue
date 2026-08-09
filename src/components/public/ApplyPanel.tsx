import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { applyFn } from "@/lib/server/candidateFns";
import type { Eligibility } from "@/lib/matching/eligibility";

/**
 * The apply action, and every reason it might not be available.
 *
 * A disabled button with no explanation is a dead end that hides whether the
 * fault is the candidate's or ours (§3.2). Each refusal here names its cause and
 * offers the next step: finish the profile, wait for Monday, or look elsewhere
 * because this role genuinely does not fit.
 */
export type ApplyState =
  | { state: "signed_out" }
  | { state: "profile_incomplete"; missing: string[] }
  | { state: "not_eligible"; eligibility: Eligibility }
  | { state: "quota_exhausted"; resetsAt: Date }
  | { state: "already_applied"; applicationId: string }
  | { state: "ready"; remaining: number; limit: number };

export function ApplyPanel({
  jobId,
  companyName,
  slaResponseDays,
  apply,
}: {
  jobId: string;
  companyName: string;
  slaResponseDays: number;
  apply: ApplyState;
}) {
  const router = useRouter();
  const [coverLetter, setCoverLetter] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const result = await applyFn({
        data: { jobId, coverLetter: coverLetter.trim() || null },
      });

      toast.success("Applied", {
        description: `${companyName} has until ${result.slaDueAt.toLocaleDateString()} to reply.`,
      });
      await router.invalidate();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (apply.state === "signed_out") {
    return (
      <Card className="p-6">
        <p className="text-sm text-[var(--brand-ink)]">
          {companyName} has committed to replying within {slaResponseDays} days.
        </p>
        <Button asChild variant="brand" className="mt-4 w-full">
          <Link to="/auth/signup">Create a profile to apply</Link>
        </Button>
      </Card>
    );
  }

  if (apply.state === "already_applied") {
    return (
      <Card className="p-6">
        <Badge variant="success">Applied</Badge>
        <p className="mt-3 text-sm text-[var(--brand-ink)]">
          You have applied to this role. You can follow it in your applications.
        </p>
        <Button asChild variant="outline" className="mt-4 w-full">
          <Link to="/applications">See your applications</Link>
        </Button>
      </Card>
    );
  }

  if (apply.state === "profile_incomplete") {
    return (
      <Card className="p-6">
        <p className="text-sm font-medium text-[var(--brand-ink)]">
          Finish your profile to apply
        </p>
        <p className="mt-2 text-sm text-[var(--brand-muted)]">
          Companies here reply to everyone, so we only send them applications we can match.
        </p>
        <Button asChild variant="brand" className="mt-4 w-full">
          <Link to="/profile">Complete profile</Link>
        </Button>
      </Card>
    );
  }

  if (apply.state === "not_eligible") {
    return (
      <Card className="p-6">
        <p className="text-sm font-medium text-[var(--brand-ink)]">
          This role does not match your profile
        </p>
        <ul className="mt-3 flex flex-col gap-1.5">
          {apply.eligibility.reasons.map((reason) => (
            <li key={reason} className="text-sm text-[var(--brand-muted)]">
              • {reason}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-[var(--brand-muted)]">
          If your profile is out of date, updating it will change this.
        </p>
        <Button asChild variant="outline" className="mt-4 w-full">
          <Link to="/profile">Update profile</Link>
        </Button>
      </Card>
    );
  }

  if (apply.state === "quota_exhausted") {
    return (
      <Card className="p-6">
        <p className="text-sm font-medium text-[var(--brand-ink)]">
          You have used this week's applications
        </p>
        <p className="mt-2 text-sm text-[var(--brand-muted)]">
          The limit is what keeps every company here able to answer. It comes back on{" "}
          {apply.resetsAt.toLocaleDateString(undefined, { weekday: "long" })}.
        </p>
        <Button asChild variant="outline" className="mt-4 w-full">
          <Link to="/applications">See your applications</Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <p className="text-sm text-[var(--brand-ink)]">
        {companyName} has committed to replying within <strong>{slaResponseDays} days</strong>.
      </p>

      <textarea
        value={coverLetter}
        onChange={(event) => setCoverLetter(event.target.value)}
        rows={5}
        disabled={busy}
        placeholder="Anything you want them to know (optional)"
        className="mt-4 w-full rounded-[var(--radius-sm)] border border-[var(--surface-muted-border)] bg-[var(--page)] p-3 text-sm text-[var(--brand-ink)] outline-none focus-visible:border-[var(--brand-primary)]"
      />

      <Button variant="brand" className="mt-3 w-full" disabled={busy} onClick={submit}>
        {busy ? "Applying…" : "Apply"}
      </Button>

      <p className="mt-3 text-center text-xs text-[var(--brand-muted)]">
        {apply.remaining} of {apply.limit} applications left this week
      </p>
    </Card>
  );
}
