import { Badge } from "@/components/ui/badge";
import type { Flow } from "@/lib/candidate/flow";

/**
 * How far the application got, as far as the candidate has been *told*.
 *
 * The caption is load-bearing, not decoration. A candidate who reads this rail
 * as the company's pipeline would treat a silent "Under review" as progress; the
 * rail only ever lights up when the company said something, so the interface says
 * that plainly rather than leaving the impression to be guessed at
 * (docs/PRODUCT_PLAN.md §6.4).
 */
export function StageRail({ flow, companyName }: { flow: Flow; companyName: string }) {
  const ended = flow.outcome.kind === "closed" || flow.outcome.kind === "withdrawn";

  return (
    <div>
      <div className="flex items-start gap-0">
        {flow.rail.map((step, index) => {
          const done = step.state === "reached";
          const current = step.state === "current" && !ended;
          const dim = ended || step.state === "ahead";

          return (
            <div key={step.key} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div
                  className="h-[2px] flex-1"
                  style={{
                    background:
                      index === 0
                        ? "transparent"
                        : done || current
                          ? "var(--brand-primary)"
                          : "var(--surface-muted-border)",
                  }}
                />
                <div
                  className="h-3 w-3 shrink-0 rounded-full border-2"
                  style={{
                    borderColor:
                      done || current ? "var(--brand-primary)" : "var(--surface-muted-border)",
                    background: done || current ? "var(--brand-primary)" : "var(--page)",
                    boxShadow: current ? "0 0 0 4px color-mix(in srgb, var(--brand-primary) 18%, transparent)" : undefined,
                  }}
                />
                <div
                  className="h-[2px] flex-1"
                  style={{
                    background:
                      index === flow.rail.length - 1
                        ? "transparent"
                        : done
                          ? "var(--brand-primary)"
                          : "var(--surface-muted-border)",
                  }}
                />
              </div>

              <p
                className="mt-2 px-1 text-center text-xs font-medium"
                style={{
                  color: dim ? "var(--brand-muted)" : "var(--brand-ink)",
                }}
              >
                {step.label}
              </p>
              {/* A date only where one exists. A step the current stage implies
                  but that was never announced stays blank rather than borrowing
                  a timestamp from a later event. */}
              <p className="h-4 text-center text-[11px] text-[var(--brand-muted)]">
                {step.at ? new Date(step.at).toLocaleDateString() : ""}
              </p>
            </div>
          );
        })}
      </div>

      {ended && (
        <div className="mt-3 flex items-center gap-2">
          <Badge variant={flow.outcome.kind === "closed" ? "danger" : "neutral"}>
            {flow.outcome.kind === "closed" ? "Not moving forward" : "Withdrawn"}
          </Badge>
          <span className="text-xs text-[var(--brand-muted)]">
            {new Date(
              flow.outcome.kind === "closed" || flow.outcome.kind === "withdrawn"
                ? flow.outcome.at
                : Date.now(),
            ).toLocaleDateString()}
          </span>
        </div>
      )}

      <p className="mt-3 text-xs text-[var(--brand-muted)]">
        Stages appear here when {companyName} tells you. We do not show their internal
        pipeline, so a stage you see is one they meant you to see.
      </p>
    </div>
  );
}
