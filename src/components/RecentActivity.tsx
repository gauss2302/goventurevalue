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
      <div className="rounded-lg border border-[var(--border-soft)] bg-white p-3 shadow-[var(--shadow-sm)]">
        <h3
          className="text-[12px] font-semibold text-[var(--brand-ink)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Recent Activity
        </h3>
        <p className="mt-1 text-[11px] text-[var(--brand-muted)]">
          No activity yet. Create a model to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border-soft)] bg-white shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between px-3 py-2.5">
        <h3
          className="text-[12px] font-semibold text-[var(--brand-ink)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Recent Activity
        </h3>
        <Link
          to="/models"
          className="flex items-center gap-0.5 text-[10px] font-semibold text-[var(--brand-primary)] hover:underline"
        >
          All <ArrowRight size={9} />
        </Link>
      </div>
      <div className="border-t border-[var(--border-soft)] px-3 py-2.5">
        <div className="space-y-2.5">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="relative border-l-2 border-[var(--border-soft)] pl-3 last:border-transparent"
            >
              <div className="absolute -left-[3.5px] top-0.5 h-[5px] w-[5px] rounded-full bg-[var(--brand-primary)] ring-2 ring-white" />
              <p className="text-[11px] text-[var(--brand-muted)]">
                <span className="font-medium text-[var(--brand-ink)]">{activity.action}</span>
                {" \u2014 "}
                <span className="text-[var(--brand-primary)]">{activity.target}</span>
              </p>
              <div className="mt-0.5 flex items-center gap-0.5 text-[9px] text-[var(--brand-muted)]">
                <Clock size={8} />
                {formatRelativeTime(new Date(activity.at))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
