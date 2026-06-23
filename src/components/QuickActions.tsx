import { Link } from "@tanstack/react-router";
import { Plus, Upload, Sparkles, Presentation } from "lucide-react";

const actions = [
  {
    to: "/models/new",
    icon: Plus,
    iconBg: "bg-[var(--brand-primary)]",
    iconColor: "text-white",
    title: "New Model",
    subtitle: "Clean slate",
    isLink: true,
  },
  {
    to: "#",
    icon: Upload,
    iconBg: "bg-[color-mix(in_srgb,var(--info)_14%,transparent)]",
    iconColor: "text-[var(--info)]",
    title: "Import Data",
    subtitle: "CSV / Sheets",
    isLink: false,
  },
  {
    to: "/academy",
    icon: Sparkles,
    iconBg: "bg-[color-mix(in_srgb,var(--brand-secondary)_14%,transparent)]",
    iconColor: "text-[var(--brand-secondary)]",
    title: "Walkthrough",
    subtitle: "Guided tour",
    isLink: true,
  },
  {
    to: "/pitch-decks/new",
    icon: Presentation,
    iconBg: "bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)]",
    iconColor: "text-[var(--brand-primary-hover)]",
    title: "Pitch Deck",
    subtitle: "AI slides",
    isLink: true,
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {actions.map((action) => {
        const Icon = action.icon;
        const inner = (
          <div className="flex items-center gap-[var(--space-3)]">
            <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${action.iconBg} ${action.iconColor}`}>
              <Icon size={16} strokeWidth={1.9} aria-hidden />
            </div>
            <div className="min-w-0">
              <span className="block truncate text-[var(--text-subheadline)] font-semibold text-[var(--brand-ink)]">
                {action.title}
              </span>
              <span className="block text-[var(--text-caption1)] text-[var(--brand-muted)]">
                {action.subtitle}
              </span>
            </div>
          </div>
        );

        const cls =
          "rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] px-[var(--space-4)] py-[var(--space-3)] shadow-[var(--card-shadow)] transition-all duration-300 [transition-timing-function:var(--ease-out-quint)] hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)]";

        return action.isLink ? (
          <Link key={action.title} to={action.to as any} className={cls}>
            {inner}
          </Link>
        ) : (
          <button key={action.title} className={`${cls} w-full text-left`}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}
