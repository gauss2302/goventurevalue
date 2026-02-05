import { TrendingUp, FileSpreadsheet, Users, Activity } from "lucide-react";

type StatTone = "primary" | "secondary" | "ice" | "accent";

type DashboardStat = {
  label: string;
  value: string;
  helper: string;
  tone: StatTone;
};

const toneMap: Record<
  StatTone,
  { icon: typeof FileSpreadsheet; color: string; bg: string }
> = {
  primary: {
    icon: FileSpreadsheet,
    color: "text-[var(--brand-primary)]",
    bg: "bg-[rgba(79,70,186,0.12)]",
  },
  secondary: {
    icon: Activity,
    color: "text-[var(--brand-secondary)]",
    bg: "bg-[rgba(249,137,107,0.18)]",
  },
  ice: {
    icon: Users,
    color: "text-[#2458FF]",
    bg: "bg-[rgba(36,88,255,0.12)]",
  },
  accent: {
    icon: TrendingUp,
    color: "text-[var(--brand-accent)]",
    bg: "bg-[rgba(253,188,100,0.22)]",
  },
};

export function DashboardStats({ stats }: { stats: DashboardStat[] }) {

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const tone = toneMap[stat.tone];
        const Icon = tone.icon;
        return (
          <div
            key={index}
            className="relative overflow-hidden bg-white border border-[var(--border-soft)] rounded-2xl p-5 shadow-[0_4px_16px_rgba(17,24,39,0.06)]"
          >
            <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-[rgba(79,70,186,0.06)] blur-2xl" />
            <div className="flex items-start justify-between gap-4 mb-4 relative">
              <div className={`p-3 rounded-2xl ${tone.bg} ${tone.color}`}>
                <Icon size={20} />
              </div>
              <span className="text-[11px] font-semibold text-[var(--brand-muted)] bg-[#F6F6FC] px-2 py-1 rounded-full">
                {stat.helper}
              </span>
            </div>
            <h3 className="text-2xl font-[var(--font-display)] text-[var(--brand-ink)] mb-1">
              {stat.value}
            </h3>
            <p className="text-sm text-[var(--brand-muted)]">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}
