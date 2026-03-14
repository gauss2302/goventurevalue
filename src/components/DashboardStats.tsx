import { TrendingUp, FileSpreadsheet, Users, Activity } from "lucide-react";
import { motion } from "framer-motion";

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
    bg: "bg-[var(--brand-primary)]/10",
  },
  secondary: {
    icon: Activity,
    color: "text-[var(--brand-secondary)]",
    bg: "bg-[var(--brand-secondary)]/15",
  },
  ice: {
    icon: Users,
    color: "text-[var(--brand-primary)]",
    bg: "bg-[var(--brand-ice)]/15",
  },
  accent: {
    icon: TrendingUp,
    color: "text-[var(--brand-ink)]",
    bg: "bg-[var(--brand-accent)]/30",
  },
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 1, 0.5, 1] },
  },
};

export function DashboardStats({ stats }: { stats: DashboardStat[] }) {
  const gridClass =
    stats.length === 3
      ? "grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4"
      : "grid grid-cols-2 gap-3 lg:grid-cols-4";
  return (
    <motion.div
      className={gridClass}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {stats.map((stat, index) => {
        const tone = toneMap[stat.tone];
        const Icon = tone.icon;
        return (
          <motion.div
            key={index}
            variants={cardVariants}
            className="rounded-[var(--radius-sm)] border border-[var(--border-soft)] bg-white px-3 py-2.5 shadow-[var(--shadow-sm)] sm:px-2.5 sm:py-2"
          >
            <div className="mb-1.5 flex items-center justify-between sm:mb-1">
              <div className={`flex h-7 w-7 items-center justify-center rounded-md sm:h-6 sm:w-6 sm:rounded ${tone.bg} ${tone.color}`}>
                <Icon size={14} className="sm:hidden" />
                <Icon size={12} className="hidden sm:block" />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--brand-muted)] sm:text-[8px]">
                {stat.helper}
              </span>
            </div>
            <p
              className="text-base tabular-nums leading-tight text-[var(--brand-ink)] sm:text-sm"
              style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
            >
              {stat.value}
            </p>
            <p className="mt-0.5 text-[11px] leading-tight text-[var(--brand-muted)] sm:text-[9px]">{stat.label}</p>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
