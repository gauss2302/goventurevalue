import { TrendingUp, FileSpreadsheet, Users, Activity, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type StatTone = "primary" | "secondary" | "ice" | "accent";

type DashboardStat = {
  label: string;
  value: string;
  helper: string;
  tone: StatTone;
};

const toneMap: Record<StatTone, { icon: LucideIcon; wrap: string }> = {
  primary: {
    icon: FileSpreadsheet,
    wrap: "bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] text-[var(--brand-primary-hover)]",
  },
  secondary: {
    icon: Activity,
    wrap: "bg-[color-mix(in_srgb,var(--brand-secondary)_14%,transparent)] text-[var(--brand-secondary)]",
  },
  ice: {
    icon: Users,
    wrap: "bg-[color-mix(in_srgb,var(--info)_12%,transparent)] text-[var(--info)]",
  },
  accent: {
    icon: TrendingUp,
    wrap: "bg-[color-mix(in_srgb,var(--brand-accent)_16%,transparent)] text-[#92610a] dark:text-[var(--brand-accent)]",
  },
};

export function DashboardStats({ stats }: { stats: DashboardStat[] }) {
  const gridClass =
    stats.length === 3
      ? "grid grid-cols-1 gap-[var(--space-3)] sm:grid-cols-3"
      : "grid grid-cols-2 gap-[var(--space-3)] lg:grid-cols-4";
  return (
    <div className={gridClass}>
      {stats.map((stat) => {
        const tone = toneMap[stat.tone];
        const Icon = tone.icon;
        return (
          <div
            key={stat.label}
            className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] px-[var(--space-4)] py-[var(--space-3)] shadow-[var(--card-shadow)] transition-all duration-300 [transition-timing-function:var(--ease-out-quint)] hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)]"
          >
            <div className="mb-[var(--space-2)] flex items-center justify-between">
              <div className={cn("flex size-7 items-center justify-center rounded-lg", tone.wrap)}>
                <Icon size={14} strokeWidth={1.85} aria-hidden />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-muted)]">
                {stat.helper}
              </span>
            </div>
            <p className="font-display text-[var(--text-title3)] font-bold leading-tight text-[var(--brand-ink)] tabular-nums">
              {stat.value}
            </p>
            <p className="mt-0.5 text-[var(--text-caption1)] leading-tight text-[var(--brand-muted)]">
              {stat.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
