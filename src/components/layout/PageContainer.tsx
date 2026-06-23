import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Standard content column: centered max-width, responsive token padding, and
 * an optional editorial mesh/grain atmosphere. Mobile top padding clears the
 * fixed sidebar hamburger.
 */
export function PageContainer({
  children,
  className,
  decorated = true,
}: {
  children: ReactNode;
  className?: string;
  decorated?: boolean;
}) {
  return (
    <main className="relative min-h-screen">
      {decorated && (
        <>
          <div className="grain-overlay" aria-hidden />
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 -z-0 h-[420px] w-[min(680px,80vw)] bg-mesh-accent opacity-70 blur-2xl"
          />
        </>
      )}
      <div
        className={cn(
          "relative z-[1] mx-auto w-full max-w-[var(--content-max-width)] px-[var(--page-padding-x)] pb-[var(--space-8)] pt-[64px] md:pt-[var(--page-padding-y)]",
          className
        )}
      >
        {children}
      </div>
    </main>
  );
}
