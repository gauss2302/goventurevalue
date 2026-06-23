import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Sticky in-app header used at the top of primary surfaces (e.g. the
 * dashboard). Provides a title block on the left and an actions slot on the
 * right, with a translucent, blurred backdrop.
 */
export function DashboardHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--page)_82%,transparent)] backdrop-blur-xl",
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-[var(--content-max-width)] items-center justify-between gap-[var(--space-4)] px-[var(--page-padding-x)] py-[var(--space-3)] pl-[60px] md:pl-[var(--page-padding-x)]">
        <div className="min-w-0">
          <p className="font-display truncate text-[var(--text-title3)] font-bold leading-tight tracking-[-0.01em] text-[var(--brand-ink)]">
            {title}
          </p>
          {subtitle ? (
            <p className="truncate text-[var(--text-caption1)] text-[var(--brand-muted)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-[var(--space-2)]">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
