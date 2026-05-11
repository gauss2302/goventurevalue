import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export type DashboardKpiItem = {
  label: string;
  value: string;
  badge: string;
  badgeClassName: string;
  icon: LucideIcon;
  iconWrapClassName: string;
  iconClassName: string;
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 1, 0.5, 1] as const },
  },
};

export function DashboardKpiCards({ items }: { items: DashboardKpiItem[] }) {
  return (
    <motion.div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={index}
            variants={cardVariants}
            className="flex flex-col gap-2.5 rounded-xl border border-[#eeedf3] bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${item.iconWrapClassName}`}
              >
                <Icon className={`h-4 w-4 ${item.iconClassName}`} strokeWidth={1.75} />
              </div>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${item.badgeClassName}`}
              >
                {item.badge}
              </span>
            </div>
            <div>
              <p
                className="text-xl font-bold leading-none tracking-tight text-[#0b1c30]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {item.value}
              </p>
              <p className="mt-1 text-xs text-[#6b6a76]">{item.label}</p>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
