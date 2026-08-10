import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { describeMark } from "@/lib/company/slaPolicy";
import type { ResponseRecord } from "@/lib/company/publicProfile";

/**
 * The promise, and how well this company keeps it
 * (docs/PRODUCT_PLAN.md §1.4 ②, §3.2, §6.7).
 *
 * The one differentiator competitors cannot copy without changing their business
 * model, so it gets prime position rather than a footnote.
 *
 * Three states, and telling them apart is the whole job:
 *   - nothing resolved yet → "no replies measured yet". Not 0%, which would be an
 *     accusation about a company we have never measured.
 *   - some resolved, but too few → the count, and that it is too few. Not "100%",
 *     which is an equally confident claim in the flattering direction.
 *   - enough resolved → the figure, with its denominator next to it.
 */
export function ResponsePromise({
  record,
  companyName,
}: {
  record: ResponseRecord;
  companyName: string;
}) {
  const percent = record.responseRate === null ? null : Math.round(record.responseRate * 100);
  const mark = describeMark({
    level: record.warningLevel,
    breached: record.breached,
    measured: record.measured,
    companyName,
  });

  // A marked company does not get to lead with the promise. What we know about
  // them replacing it is the honest ordering.
  if (mark) {
    return (
      <Card className="border-[var(--destructive)]/30 bg-[var(--destructive)]/5 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="danger">Missed deadlines</Badge>
          {record.markedAt && (
            <span className="text-xs text-[var(--brand-muted)]">
              since {new Date(record.markedAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <h2 className="mt-3 text-sm font-semibold text-[var(--brand-ink)]">{mark.headline}</h2>
        <p className="mt-2 text-sm text-[var(--brand-ink)]">{mark.detail}</p>
        <p className="mt-3 text-xs text-[var(--brand-muted)]">
          They still committed to replying within {record.slaResponseDays ?? 7} days. We show
          this because you are about to spend one of your applications.
        </p>
      </Card>
    );
  }

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
                {record.measured === 0
                  ? "No replies measured yet"
                  : `Only ${record.measured} measured so far — too few to publish`}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-[var(--text-title2)] font-semibold text-[var(--brand-ink)]">
                  {percent}%
                </span>
                <span className="text-xs text-[var(--brand-muted)]">
                  of {record.measured}
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
            ) : record.medianFirstResponseHours < 1 ? (
              // The figure is stored rounded to whole hours, so a fast company
              // would otherwise read as "0 hours", which looks broken rather
              // than fast. We say what we actually know.
              "Under an hour"
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
