import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Token-driven typography primitives. These replace the scattered inline
 * `style={{ fontFamily: "var(--font-display)" }}` usages and arbitrary
 * `text-[11px]` sizes across the app with a single, consistent scale.
 */

type HeadingProps = React.HTMLAttributes<HTMLHeadingElement>;
type ParagraphProps = React.HTMLAttributes<HTMLParagraphElement>;
type SpanProps = React.HTMLAttributes<HTMLSpanElement>;

export function DisplayHeading({ className, ...props }: HeadingProps) {
  return (
    <h1
      className={cn(
        "font-display text-[var(--text-display)] font-extrabold leading-[1.05] tracking-[-0.03em] text-[var(--brand-ink)]",
        className
      )}
      {...props}
    />
  );
}

export function PageTitle({ className, ...props }: HeadingProps) {
  return (
    <h1
      className={cn(
        "font-display text-[var(--text-headline)] font-bold leading-[1.12] tracking-[-0.02em] text-[var(--brand-ink)]",
        className
      )}
      {...props}
    />
  );
}

export function SectionTitle({ className, ...props }: HeadingProps) {
  return (
    <h2
      className={cn(
        "font-display text-[var(--text-title2)] font-semibold leading-[1.25] tracking-[-0.01em] text-[var(--brand-ink)]",
        className
      )}
      {...props}
    />
  );
}

export function SubTitle({ className, ...props }: HeadingProps) {
  return (
    <h3
      className={cn(
        "font-display text-[var(--text-title3)] font-semibold leading-[1.3] tracking-[-0.01em] text-[var(--brand-ink)]",
        className
      )}
      {...props}
    />
  );
}

export function Eyebrow({ className, ...props }: SpanProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-[var(--text-caption1)] font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary-hover)]",
        className
      )}
      {...props}
    />
  );
}

export function Lead({ className, ...props }: ParagraphProps) {
  return (
    <p
      className={cn(
        "text-[length:var(--text-callout)] leading-relaxed text-[var(--brand-muted)] sm:text-[length:var(--text-body)]",
        className
      )}
      {...props}
    />
  );
}

export function Muted({ className, ...props }: ParagraphProps) {
  return (
    <p
      className={cn(
        "text-[var(--text-subheadline)] text-[var(--brand-muted)]",
        className
      )}
      {...props}
    />
  );
}
