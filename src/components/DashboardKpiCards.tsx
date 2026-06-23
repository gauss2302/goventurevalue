import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type KpiTone = "primary" | "accent" | "info";

export type DashboardKpiItem = {
  label: string;
  value: string;
  badge: string;
  tone: KpiTone;
  icon: LucideIcon;
};

const toneStyles: Record<
  KpiTone,
  { iconWrap: string; badge: "brand" | "accent" | "info" }
> = {
  primary: {
    iconWrap:
      "bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] text-[var(--brand-primary-hover)]",
    badge: "brand",
  },
  accent: {
    iconWrap:
      "bg-[color-mix(in_srgb,var(--brand-accent)_16%,transparent)] text-[#92610a] dark:text-[var(--brand-accent)]",
    badge: "accent",
  },
  info: {
    iconWrap:
      "bg-[color-mix(in_srgb,var(--brand-secondary)_14%,transparent)] text-[var(--brand-secondary)]",
    badge: "info",
  },
};

export function DashboardKpiCards({ items }: { items: DashboardKpiItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        const tone = toneStyles[item.tone];
        return (
          <div
            key={item.label}
            className="group flex flex-col gap-[var(--space-4)] rounded-[var(--card-radius)] border border-[var(--border-soft)] bg-[var(--surface)] p-[var(--space-5)] shadow-[var(--card-shadow)] transition-all duration-300 [transition-timing-function:var(--ease-out-quint)] hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)]"
          >
            <div className="flex items-center justify-between gap-2">
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105",
                  tone.iconWrap
                )}
              >
                <Icon className="size-5" strokeWidth={1.85} aria-hidden />
              </div>
              <Badge variant={tone.badge}>{item.badge}</Badge>
            </div>
            <div>
              <p className="font-display text-[var(--text-title1)] font-bold leading-none tracking-[-0.02em] text-[var(--brand-ink)] tabular-nums">
                {item.value}
              </p>
              <p className="mt-[var(--space-2)] text-[var(--text-subheadline)] text-[var(--brand-muted)]">
                {item.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
