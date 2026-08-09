import { Card } from "@/components/ui/card";
import { SignalValue } from "@/components/signal/SignalValue";
import type { CompanySignals } from "@/lib/company/publicProfile";

/**
 * Startup Signal — the investor's view, handed to the candidate
 * (docs/PRODUCT_PLAN.md §1.4 ①).
 *
 * Every value arrives as a `Signal<T>` that has already passed `publicView`, so
 * this component cannot show a number without its date, or a guess without the
 * word "estimate" on it.
 *
 * Expect most of these to read "No data" until the prospecting pipeline exists.
 * That is the honest state and it is shown rather than hidden: a panel that
 * quietly omits what it does not know implies it knows the rest.
 */
export function CompanySignalPanel({
  signals,
  companyName,
}: {
  signals: CompanySignals;
  companyName: string;
}) {
  const known = Object.values(signals).filter((signal) => signal.kind !== "no_data").length;

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-[var(--brand-ink)]">Company signals</h2>
      <p className="mt-1 text-xs text-[var(--brand-muted)]">
        What an investor would look at before joining {companyName}.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        <SignalValue
          label="Team size"
          signal={signals.teamSize}
          format={(value) => `${value} people`}
        />
        <SignalValue
          label="Months since last raise"
          signal={signals.monthsSinceLastRaise}
          format={(value) => `${value} months`}
        />
        <SignalValue
          label="Estimated runway"
          signal={signals.runwayMonths}
          format={(value) => `${value} months`}
        />
        <SignalValue
          label="Team growth, 90 days"
          signal={signals.teamGrowthRate90d}
          format={(value) => `${value > 0 ? "+" : ""}${Math.round(value * 100)}%`}
        />
        <SignalValue
          label="Open roles"
          signal={signals.openRoles}
          format={(value) => `${value}`}
        />
      </div>

      {known === 0 && (
        <p className="mt-5 border-t border-[var(--surface-muted-border)] pt-4 text-xs text-[var(--brand-muted)]">
          We have nothing verified about this company yet. We would rather say that than
          show a number we cannot stand behind.
        </p>
      )}
    </Card>
  );
}
