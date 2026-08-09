import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ResponseRecord } from "@/lib/company/publicProfile";

/**
 * The promise, and how well this company keeps it
 * (docs/PRODUCT_PLAN.md §1.4 ②, §3.2).
 *
 * The one differentiator competitors cannot copy without changing their business
 * model, so it gets prime position rather than a footnote.
 *
 * A company with nothing resolved shows "no replies measured yet" instead of 0%.
 * Zero would read as an accusation, and accusing a company of ignoring people it
 * has never heard from is exactly the kind of confident wrongness the honesty
 * contract exists to prevent (§6.4 rule 2).
 */
export function ResponsePromise({
  record,
  companyName,
}: {
  record: ResponseRecord;
  companyName: string;
}) {
  const percent = record.responseRate === null ? null : Math.round(record.responseRate * 100);

  return (
    <Card className="border-[var(--success)]/30 bg-[var(--success)]/5 p-6">
      <h2 className="text-sm font-semibold text-[var(--brand-ink)]">You will get an answer</h2>

      <p className="mt-2 text-sm text-[var(--brand-ink)]">
        {companyName} has committed to replying to every applicant within{" "}
        <strong>{record.slaResponseDays ?? 7} days</strong>. A rejection counts; silence
        does not.
      </p>

      <dl className="mt-5 flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-xs uppercase tracking-wide text-[var(--brand-muted)]">
            Replies on time
          </dt>
          <dd className="text-right">
            {percent === null ? (
              <span className="text-sm italic text-[var(--brand-muted)]">
                No replies measured yet
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-[var(--text-title2)] font-semibold text-[var(--brand-ink)]">
                  {percent}%
                </span>
                {percent >= 90 && <Badge variant="success">Excellent</Badge>}
                {percent < 60 && <Badge variant="warning">Below our bar</Badge>}
              </span>
            )}
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-xs uppercase tracking-wide text-[var(--brand-muted)]">
            Typical first reply
          </dt>
          <dd className="text-sm font-medium text-[var(--brand-ink)]">
            {record.medianFirstResponseHours === null ? (
              <span className="italic text-[var(--brand-muted)]">No data yet</span>
            ) : record.medianFirstResponseHours < 48 ? (
              `${record.medianFirstResponseHours} hours`
            ) : (
              `${Math.round(record.medianFirstResponseHours / 24)} days`
            )}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
