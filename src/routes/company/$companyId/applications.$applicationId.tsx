import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SlaBadge, formatDeadline } from "@/components/company/SlaBadge";
import { applicationStatusEnum } from "@/db/schema";
import { changeStatusFn, getThreadFn, respondFn } from "@/lib/server/companyFns";
import { countsAsCompanyResponse, type ApplicationEventKind } from "@/lib/application/sla";

export const Route = createFileRoute("/company/$companyId/applications/$applicationId")({
  loader: async ({ params }) => getThreadFn({ data: { applicationId: params.applicationId } }),
  component: ApplicationThread,
});

const EVENT_LABEL: Record<ApplicationEventKind, string> = {
  submitted: "Applied",
  status_changed: "Status changed",
  internal_note: "Internal note",
  assigned: "Assigned",
  message_to_candidate: "You replied",
  decision: "You sent a decision",
  candidate_message: "Candidate wrote",
  candidate_withdrew: "Candidate withdrew",
};

/**
 * One application: its history, and the reply box.
 *
 * The screen deliberately teaches the response rule rather than hiding it. A
 * recruiter who moves the status to "in review" and walks away has done nothing
 * the candidate can perceive, so the interface says so instead of letting them
 * believe the obligation is discharged (§6.6).
 */
function ApplicationThread() {
  const { application: app, events } = Route.useLoaderData();
  const router = useRouter();

  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const answered = app.slaState === "answered" || app.slaState === "breached";
  const dueAt = new Date(app.slaDueAt);

  const send = async (decision: boolean) => {
    setBusy(true);
    try {
      const result = await respondFn({
        data: {
          applicationId: app.id,
          body: body.trim(),
          decision,
          toStatus: decision ? "rejected" : undefined,
        },
      });

      toast.success(
        result.slaState === "answered"
          ? "Replied in time"
          : "Reply sent — it was past the deadline",
      );
      setBody("");
      await router.invalidate();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (toStatus: string) => {
    setBusy(true);
    try {
      await changeStatusFn({ data: { applicationId: app.id, toStatus: toStatus as never } });
      // Said plainly, because this is exactly where people assume otherwise.
      toast.info("Status updated — the candidate has not been told yet");
      await router.invalidate();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--brand-muted)]">
              Application
            </p>
            <p className="mt-1 font-semibold text-[var(--brand-ink)]">
              Applied {new Date(app.appliedAt).toLocaleDateString()}
            </p>
          </div>
          <SlaBadge state={app.slaState} dueAt={app.slaDueAt} />
        </div>

        {!answered && (
          <p className="mt-3 text-sm text-[var(--brand-ink)]">
            You committed to replying by{" "}
            <strong>{dueAt.toLocaleDateString()}</strong> — {formatDeadline(dueAt)}.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--brand-muted)]">Status:</span>
          <select
            value={app.status}
            disabled={busy}
            onChange={(event) => setStatus(event.target.value)}
            className="h-8 rounded-[var(--radius-sm)] border border-[var(--surface-muted-border)] bg-[var(--page)] px-2 text-sm text-[var(--brand-ink)]"
          >
            {applicationStatusEnum.enumValues.map((value) => (
              <option key={value} value={value}>
                {value.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <span className="text-xs text-[var(--brand-muted)]">
            Internal only — this does not count as a reply.
          </span>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-[var(--brand-ink)]">History</h3>
        <ol className="mt-4 flex flex-col gap-3">
          {events.map((event) => (
            <li key={event.id} className="flex gap-3">
              <div
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{
                  background: countsAsCompanyResponse(event.kind)
                    ? "var(--success)"
                    : "var(--surface-muted-border)",
                }}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-[var(--brand-ink)]">
                    {EVENT_LABEL[event.kind]}
                  </span>
                  <span className="text-xs text-[var(--brand-muted)]">
                    {new Date(event.occurredAt).toLocaleString()}
                  </span>
                  {!event.isCandidateVisible && (
                    <Badge variant="neutral">Not visible to candidate</Badge>
                  )}
                </div>
                {event.body && event.kind !== "assigned" && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--brand-muted)]">
                    {event.body}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-[var(--brand-ink)]">Reply to the candidate</h3>
        <p className="mt-1 text-xs text-[var(--brand-muted)]">
          This is what satisfies your commitment. A clear no counts just as much as a yes.
        </p>

        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={5}
          disabled={busy}
          placeholder="Thanks for applying…"
          className="mt-3 w-full rounded-[var(--radius-sm)] border border-[var(--surface-muted-border)] bg-[var(--page)] p-3 text-sm text-[var(--brand-ink)] outline-none focus-visible:border-[var(--brand-primary)]"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="brand"
            disabled={busy || body.trim().length === 0}
            onClick={() => send(false)}
          >
            Send reply
          </Button>
          <Button
            variant="outline"
            disabled={busy || body.trim().length === 0}
            onClick={() => send(true)}
          >
            Send rejection
          </Button>
        </div>
      </Card>
    </div>
  );
}
