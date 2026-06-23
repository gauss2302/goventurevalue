import { type ReactNode } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { useReducedMotionSafe, pageVariants } from "@/lib/motion";
import { PageTitle, Eyebrow, Lead } from "@/components/ui/typography";

/**
 * Shared page header: eyebrow label, display title, supporting description and
 * an optional actions cluster. Animates in (reduced-motion safe).
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const variants = useReducedMotionSafe(pageVariants);

  return (
    <motion.header
      initial="hidden"
      animate="visible"
      variants={variants}
      className={cn(
        "flex flex-col gap-[var(--space-4)] sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="space-y-[var(--space-3)]">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <PageTitle>{title}</PageTitle>
        {description ? <Lead className="max-w-2xl">{description}</Lead> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-[var(--space-3)]">
          {actions}
        </div>
      ) : null}
    </motion.header>
  );
}
