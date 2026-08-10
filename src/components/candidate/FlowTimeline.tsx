import { Badge } from "@/components/ui/badge";
import { STAGE_LABEL, type FlowEntry } from "@/lib/candidate/flow";

/**
 * Everything that has happened to one application, in order.
 *
 * Each entry is attributed. A company's words are shown as a quote in their own
 * block; anything we assert ourselves — the commitment, a missed deadline — is
 * marked as ours. The candidate should never have to wonder whether a sentence
 * came from the company or from us (docs/PRODUCT_PLAN.md §6.4).
 */

const DOT: Record<FlowEntry["kind"], string> = {
  applied: "var(--surface-muted-border)",
  commitment: "var(--info)",
  message: "var(--success)",
  decision: "var(--success)",
  candidate_reply: "var(--brand-muted)",
  withdrawn: "var(--surface-muted-border)",
  deadline_missed: "var(--destructive)",
};

const ATTRIBUTION: Record<FlowEntry["actor"], string | null> = {
  company: null,
  candidate: null,
  // Said in our own voice, so it is labelled as ours.
  platform: "Recorded by us",
};

export function FlowTimeline({ entries }: { entries: FlowEntry[] }) {
  return (
    <ol className="flex flex-col">
      {entries.map((entry, index) => (
        <li key={entry.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: DOT[entry.kind] }}
            />
            {index < entries.length - 1 && (
              <div className="w-[2px] flex-1 bg-[var(--surface-muted-border)]" />
            )}
          </div>

          <div className={`min-w-0 flex-1 ${index < entries.length - 1 ? "pb-5" : ""}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-[var(--brand-ink)]">{entry.title}</span>
              <span className="text-xs text-[var(--brand-muted)]">
                {new Date(entry.at).toLocaleString(undefined, {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {entry.unread && <Badge variant="brand">New</Badge>}
              {entry.stage && (
                <Badge variant="info">Moved to {STAGE_LABEL[entry.stage.to]}</Badge>
              )}
            </div>

            {ATTRIBUTION[entry.actor] && (
              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-[var(--brand-muted)]">
                {ATTRIBUTION[entry.actor]}
              </p>
            )}

            {entry.body && (
              <div
                className="mt-2 rounded-[var(--radius-sm)] border p-3 text-sm whitespace-pre-wrap"
                style={{
                  borderColor:
                    entry.actor === "company"
                      ? "color-mix(in srgb, var(--success) 30%, transparent)"
                      : "var(--surface-muted-border)",
                  background:
                    entry.actor === "company"
                      ? "color-mix(in srgb, var(--success) 5%, transparent)"
                      : "var(--surface-2)",
                  color: "var(--brand-ink)",
                }}
              >
                {entry.body}
              </div>
            )}

            {entry.satisfiedPromise && (
              <p className="mt-1.5 text-xs text-[var(--success)]">
                This is the reply that met their commitment.
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
