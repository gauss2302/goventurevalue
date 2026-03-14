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
    iconBg: "bg-[var(--brand-ice)]/15",
    iconColor: "text-[var(--brand-primary)]",
    title: "Import Data",
    subtitle: "CSV / Sheets",
    isLink: false,
  },
  {
    to: "/academy",
    icon: Sparkles,
    iconBg: "bg-[var(--brand-secondary)]/15",
    iconColor: "text-[var(--brand-secondary)]",
    title: "Walkthrough",
    subtitle: "Guided tour",
    isLink: true,
  },
  {
    to: "/pitch-decks/new",
    icon: Presentation,
    iconBg: "bg-[var(--brand-primary)]/10",
    iconColor: "text-[var(--brand-primary)]",
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
          <div className="flex items-center gap-2.5">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${action.iconBg} ${action.iconColor}`}>
              <Icon size={14} />
            </div>
            <div className="min-w-0">
              <span className="block truncate text-[12px] font-semibold text-[var(--brand-ink)]">
                {action.title}
              </span>
              <span className="block text-[10px] text-[var(--brand-muted)]">
                {action.subtitle}
              </span>
            </div>
          </div>
        );

        const cls =
          "rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2.5 shadow-[var(--shadow-sm)] transition-all duration-150 hover:shadow-[var(--shadow-md)]";

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
