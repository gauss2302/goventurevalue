import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FlowTimeline } from "@/components/candidate/FlowTimeline";
import { StageRail } from "@/components/candidate/StageRail";
import { ResponsePromise } from "@/components/public/ResponsePromise";
import { SlaBadge } from "@/components/company/SlaBadge";
import { requireAuthForLoader } from "@/lib/auth/requireAuth";
import {
  getMyApplicationFn,
  markApplicationSeenFn,
  sendCandidateMessageFn,
  withdrawFn,
} from "@/lib/server/candidateFns";

export const Route = createFileRoute("/applications/$applicationId")({
  beforeLoad: async ({ location }) => {
    await requireAuthForLoader(location);
  },
  loader: async ({ params }) =>
    getMyApplicationFn({ data: { applicationId: params.applicationId } }),
  head: ({ loaderData }) =>
    loaderData
      ? { meta: [{ title: `${loaderData.role.title} at ${loaderData.company.name}` }] }
      : {},
  component: ApplicationFlow,
});

/**
 * One application, in full.
 *
 * This is the screen the response promise is made to. It answers, without the
 * candidate having to infer anything: what you sent, what they committed to,
 * what they have actually told you, where it stands now, and what happens next.
 * Everything on it is either a recorded act or a measurement of one — nothing is
 * predicted, and nothing internal to the company appears (§3.2, §6.4).
 */
function ApplicationFlow() {
  const { applicationId, role, company, responseRecord, flow, coverLetter } =
    Route.useLoaderData();
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const marked = useRef(false);

  // Marked read after rendering, not while loading, so the "New" markers on the
  // entries that just arrived are still visible on this visit.
  useEffect(() => {
    if (marked.current || flow.unreadCount === 0) {
      return;
    }
    marked.current = true;
    void markApplicationSeenFn({ data: { applicationId } }).catch(() => undefined);
  }, [applicationId, flow.unreadCount]);

  const send = async () => {
    setBusy(true);
    try {
      await sendCandidateMessageFn({ data: { applicationId, body: message.trim() } });
      setMessage("");
      await router.invalidate();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    setBusy(true);
    try {
      await withdrawFn({ data: { applicationId } });
      toast.success("Withdrawn — this no longer counts against the company");
      await router.invalidate();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[820px] px-6 py-10">
      <Link
        to="/applications"
        className="text-sm text-[var(--brand-muted)] hover:text-[var(--brand-ink)]"
      >
        ← All applications
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1
            className="text-[var(--text-title1)] text-[var(--brand-ink)]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
          >
            {role.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            <Link
              to="/companies/$slug"
              params={{ slug: company.slug }}
              className="hover:text-[var(--brand-ink)]"
            >
              {company.name}
            </Link>
            {" · "}
            <Link
              to="/jobs/$jobId"
              params={{ jobId: role.id }}
              className="hover:text-[var(--brand-ink)]"
            >
              View the role
            </Link>
          </p>
        </div>
        <SlaBadge state={flow.reply.state} dueAt={flow.reply.dueAt} />
      </div>

      {/* Where the promise stands, and what — if anything — is expected of the
          candidate. Stated in one place so it is never spread across badges the
          reader has to assemble themselves. */}
      <Card
        className="mt-6 p-5"
        style={
          flow.reply.state === "breached"
            ? { borderColor: "color-mix(in srgb, var(--destructive) 30%, transparent)" }
            : undefined
        }
      >
        <p className="text-sm font-medium text-[var(--brand-ink)]">{flow.reply.summary}</p>
        <p className="mt-1.5 text-sm text-[var(--brand-muted)]">{flow.next}</p>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="text-sm font-semibold text-[var(--brand-ink)]">Where it stands</h2>
        <div className="mt-5">
          <StageRail flow={flow} companyName={company.name} />
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="text-sm font-semibold text-[var(--brand-ink)]">Everything so far</h2>
        <div className="mt-4">
          <FlowTimeline entries={flow.entries} />
        </div>
      </Card>

      {flow.canMessage ? (
        <Card className="mt-4 p-5">
          <h2 className="text-sm font-semibold text-[var(--brand-ink)]">Write back</h2>
          <p className="mt-1 text-xs text-[var(--brand-muted)]">
            {/* Said plainly: their commitment covered the first reply, and we do
                not measure what follows, so we do not imply a second deadline. */}
            They have replied, so the thread is open. We do not put a deadline on
            replies after the first one, so we cannot promise how fast this gets read.
          </p>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            disabled={busy}
            placeholder="Thanks — one question about the team…"
            className="mt-3 w-full rounded-[var(--radius-sm)] border border-[var(--surface-muted-border)] bg-[var(--page)] p-3 text-sm text-[var(--brand-ink)] outline-none focus-visible:border-[var(--brand-primary)]"
          />
          <div className="mt-3 flex">
            <Button
              variant="brand"
              disabled={busy || message.trim().length === 0}
              onClick={send}
            >
              Send
            </Button>
          </div>
        </Card>
      ) : (
        flow.outcome.kind !== "withdrawn" && (
          <Card className="mt-4 p-5">
            <h2 className="text-sm font-semibold text-[var(--brand-ink)]">Write back</h2>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">
              Opens once {company.name} has replied. Nobody is reading this thread before
              then, and a message here would not reach them.
            </p>
          </Card>
        )
      )}

      <div className="mt-4">
        <ResponsePromise record={responseRecord} companyName={company.name} />
      </div>

      {coverLetter && (
        <Card className="mt-4 p-5">
          <h2 className="text-sm font-semibold text-[var(--brand-ink)]">What you sent</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--brand-muted)]">
            {coverLetter}
          </p>
        </Card>
      )}

      {flow.canWithdraw && (
        <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm font-medium text-[var(--brand-ink)]">
              No longer interested?
            </p>
            <p className="mt-0.5 text-xs text-[var(--brand-muted)]">
              Withdrawing releases {company.name} from the deadline. It is not counted
              against them, because you changed your mind and they did not.
            </p>
          </div>
          <Button variant="outline" size="sm" disabled={busy} onClick={withdraw}>
            Withdraw
          </Button>
        </Card>
      )}

      {flow.outcome.kind === "withdrawn" && (
        <div className="mt-4">
          <Badge variant="neutral">You withdrew this application</Badge>
        </div>
      )}
    </div>
  );
}
