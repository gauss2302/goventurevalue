import { type ReactNode } from "react";
import { Loader2, AlertTriangle, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { SectionTitle, Muted } from "@/components/ui/typography";

/**
 * Empty state: icon medallion, title, description, and an optional action.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--card-radius)] border border-dashed border-[var(--border-soft)] bg-[var(--surface)] px-[var(--space-6)] py-[var(--space-8)] text-center",
        className
      )}
    >
      {Icon ? (
        <div className="mb-[var(--space-4)] flex size-14 items-center justify-center rounded-2xl bg-[var(--brand-primary-muted)] text-[var(--brand-primary-hover)]">
          <Icon className="size-6" strokeWidth={1.75} aria-hidden />
        </div>
      ) : null}
      <SectionTitle className="text-[var(--text-title3)]">{title}</SectionTitle>
      {description ? (
        <Muted className="mt-[var(--space-2)] max-w-md">{description}</Muted>
      ) : null}
      {action ? <div className="mt-[var(--space-5)]">{action}</div> : null}
    </div>
  );
}

/**
 * Full-height centered loading state with a brand spinner.
 */
export function LoadingState({
  message = "Loading…",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[50vh] flex-col items-center justify-center gap-[var(--space-3)] text-center",
        className
      )}
    >
      <Loader2
        className="size-6 animate-spin text-[var(--brand-primary)]"
        aria-hidden
      />
      <Muted>{message}</Muted>
    </div>
  );
}

/**
 * Full-height centered error state with optional retry action.
 */
export function ErrorState({
  title = "Something went wrong",
  message,
  action,
  className,
}: {
  title?: ReactNode;
  message?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[50vh] flex-col items-center justify-center gap-[var(--space-3)] text-center",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--destructive)_12%,transparent)] text-[var(--destructive)]">
        <AlertTriangle className="size-6" strokeWidth={1.75} aria-hidden />
      </div>
      <SectionTitle className="text-[var(--text-title3)]">{title}</SectionTitle>
      {message ? <Muted className="max-w-md">{message}</Muted> : null}
      {action ? <div className="mt-[var(--space-2)]">{action}</div> : null}
    </div>
  );
}
