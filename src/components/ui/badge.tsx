import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "border-[var(--surface-muted-border)] bg-[var(--surface-2)] text-[var(--brand-muted)]",
        success: "border-transparent bg-[var(--success)]/12 text-[var(--success)]",
        warning: "border-transparent bg-[var(--warning)]/15 text-[#8a5200]",
        danger: "border-transparent bg-[var(--destructive)]/12 text-[var(--destructive)]",
        info: "border-transparent bg-[var(--info)]/12 text-[var(--info)]",
        brand: "border-transparent bg-[var(--brand-primary)]/12 text-[var(--brand-primary)]",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
