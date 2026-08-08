import { Badge } from "@/components/ui/badge";
import type { SlaState } from "@/lib/application/sla";

/**
 * The response state of one application, said plainly.
 *
 * The wording is deliberate. "Pending" tells a recruiter nothing actionable, so
 * a live obligation is shown as the time left — and once it runs out, as
 * "overdue" rather than a neutral label. The promise is the product (§3.2), and
 * the interface should make missing it feel like missing it.
 */

const HOUR = 3_600_000;

export const formatDeadline = (dueAt: Date, now: Date = new Date()): string => {
  const remainingHours = (dueAt.getTime() - now.getTime()) / HOUR;

  if (remainingHours < 0) {
    const overdueDays = Math.floor(-remainingHours / 24);
    if (overdueDays >= 1) {
      return `${overdueDays}d overdue`;
    }
    return `${Math.max(1, Math.floor(-remainingHours))}h overdue`;
  }

  if (remainingHours < 24) {
    return `${Math.max(1, Math.floor(remainingHours))}h left`;
  }

  return `${Math.floor(remainingHours / 24)}d left`;
};

export function SlaBadge({
  state,
  dueAt,
  now = new Date(),
}: {
  state: SlaState;
  dueAt?: Date | string | null;
  now?: Date;
}) {
  if (state === "answered") {
    return <Badge variant="success">Answered</Badge>;
  }

  if (state === "breached") {
    return <Badge variant="danger">Missed</Badge>;
  }

  if (state === "cancelled") {
    // Not counted against the company — the candidate withdrew (§6.6).
    return <Badge variant="neutral">Withdrawn</Badge>;
  }

  if (!dueAt) {
    return <Badge variant="info">Awaiting reply</Badge>;
  }

  const due = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  const overdue = due.getTime() < now.getTime();

  return (
    <Badge variant={overdue ? "danger" : due.getTime() - now.getTime() < 24 * HOUR ? "warning" : "info"}>
      {formatDeadline(due, now)}
    </Badge>
  );
}
