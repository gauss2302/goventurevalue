import { Link } from "@tanstack/react-router";
import { Clock, ArrowRight } from "lucide-react";

type ActivityItem = {
  id: number;
  action: string;
  target: string;
  at: string;
};

const formatRelativeTime = (date: Date) => {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export function RecentActivity({ activities }: { activities: ActivityItem[] }) {
  if (activities.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-[var(--space-4)] shadow-[var(--card-shadow)]">
        <h3 className="font-display text-[var(--text-subheadline)] font-bold text-[var(--brand-ink)]">
          Recent Activity
        </h3>
        <p className="mt-1 text-[var(--text-caption1)] text-[var(--brand-muted)]">
          No activity yet. Create a model to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] shadow-[var(--card-shadow)]">
      <div className="flex items-center justify-between px-[var(--space-4)] py-[var(--space-3)]">
        <h3 className="font-display text-[var(--text-subheadline)] font-bold text-[var(--brand-ink)]">
          Recent Activity
        </h3>
        <Link
          to="/models"
          className="flex items-center gap-1 text-[var(--text-caption1)] font-semibold text-[var(--brand-primary-hover)] hover:underline"
        >
          All <ArrowRight size={11} aria-hidden />
        </Link>
      </div>
      <div className="border-t border-[var(--border-soft)] px-[var(--space-4)] py-[var(--space-3)]">
        <div className="space-y-[var(--space-3)]">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="relative border-l-2 border-[var(--border-soft)] pl-[var(--space-3)] last:border-transparent"
            >
              <div className="absolute -left-[3.5px] top-1 size-1.5 rounded-full bg-[var(--brand-primary)] ring-2 ring-[var(--surface)]" />
              <p className="text-[var(--text-caption1)] text-[var(--brand-muted)]">
                <span className="font-medium text-[var(--brand-ink)]">{activity.action}</span>
                {" \u2014 "}
                <span className="text-[var(--brand-primary-hover)]">{activity.target}</span>
              </p>
              <div className="mt-0.5 flex items-center gap-1 text-[var(--text-caption2)] text-[var(--brand-muted)]">
                <Clock size={10} aria-hidden />
                {formatRelativeTime(new Date(activity.at))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
