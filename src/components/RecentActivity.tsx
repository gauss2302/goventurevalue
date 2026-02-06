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
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
};

export function RecentActivity({ activities }: { activities: ActivityItem[] }) {
  if (activities.length === 0) {
    return (
      <div className="bg-white border border-[var(--border-soft)] rounded-[var(--card-radius)] p-6 shadow-[var(--card-shadow)]">
        <h3 className="text-lg font-[var(--font-display)] text-[var(--brand-ink)] mb-2">
          Recent Activity
        </h3>
        <p className="text-sm text-[var(--brand-muted)]">
          No recent updates yet. Create your first model to see activity here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[var(--border-soft)] rounded-[var(--card-radius)] p-6 shadow-[var(--card-shadow)]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-[var(--font-display)] text-[var(--brand-ink)]">
          Recent Activity
        </h3>
        <Link
          to="/models"
          className="text-sm text-[var(--brand-primary)] hover:text-[var(--brand-secondary)] flex items-center gap-1"
        >
          View all <ArrowRight size={14} />
        </Link>
      </div>
      <div className="space-y-6">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="relative pl-6 pb-6 last:pb-0 border-l-2 border-[var(--surface-muted-border)] last:border-0 border-solid"
          >
            <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-[var(--brand-primary)] ring-4 ring-white" />
            <div className="flex flex-col gap-1">
              <p className="text-sm text-[var(--brand-muted)]">
                <span className="font-semibold text-[var(--brand-ink)]">
                  {activity.action}
                </span>
                {" - "}
                <span className="text-[var(--brand-primary)]">
                  {activity.target}
                </span>
              </p>
              <div className="flex items-center gap-1 text-xs text-[var(--brand-muted)]">
                <Clock size={12} />
                <span>{formatRelativeTime(new Date(activity.at))}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
