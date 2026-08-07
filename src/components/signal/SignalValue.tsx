import { cn } from "@/lib/utils";
import { describeNoData, type Signal } from "@/lib/signal/index";

/**
 * The only sanctioned way to render a company signal.
 *
 * It takes `Signal<T>` rather than `T | null`, which is what makes the honesty
 * contract structural: there is no prop shape that lets a caller pass a bare
 * number, so "as of" and fact-vs-estimate cannot be dropped by accident
 * (docs/PRODUCT_PLAN.md §6.4 rule 1).
 *
 * Rendering a stored signal directly — rather than the output of `publicView` —
 * bypasses the dispute, confidence and staleness gates. Always pass a
 * `publicView(...)` result here.
 */

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
});

export type SignalValueProps<T> = {
  label: string;
  signal: Signal<T>;
  /** Renders the value itself. Receives only values, never null. */
  format: (value: T) => string;
  className?: string;
};

export function SignalValue<T>({ label, signal, format, className }: SignalValueProps<T>) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs uppercase tracking-wide text-[var(--brand-muted)]">{label}</span>

      {signal.kind === "no_data" ? (
        // Rule 2: absence is stated, with its reason. Never 0, never an em dash
        // that reads like a value.
        <span className="text-sm italic text-[var(--brand-muted)]">
          {describeNoData(signal)}
        </span>
      ) : (
        <>
          <span
            className={cn(
              "text-lg text-[var(--brand-ink)]",
              // Rule 3: an estimate must not look like a measurement.
              signal.kind === "estimated" && "font-normal italic",
              signal.kind === "measured" && "font-semibold",
            )}
          >
            {format(signal.value)}
          </span>

          <span className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--brand-muted)]">
            {signal.kind === "estimated" && (
              <span className="rounded-full border border-[var(--brand-muted)]/30 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                Estimate
              </span>
            )}
            <span>as of {dateFormatter.format(signal.provenance.asOf)}</span>
          </span>

          {signal.kind === "estimated" && (
            // Rule 3: the method is disclosable, not buried.
            <details className="text-xs text-[var(--brand-muted)]">
              <summary className="cursor-pointer underline underline-offset-2">
                How this is estimated
              </summary>
              <p className="mt-1 leading-relaxed">{signal.method}</p>
            </details>
          )}
        </>
      )}
    </div>
  );
}
