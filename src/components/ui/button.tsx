import * as React from "react"

import { Slot } from "radix-ui"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]",
        brand:
          "bg-[var(--brand-primary)] text-white shadow-[0_6px_18px_color-mix(in_srgb,var(--brand-primary)_35%,transparent)] hover:bg-[var(--brand-primary-hover)] hover:shadow-[0_10px_26px_color-mix(in_srgb,var(--brand-primary)_42%,transparent)] active:scale-[0.98] focus-visible:ring-[var(--brand-primary)]",
        accent:
          "bg-[var(--brand-accent)] text-[#3d2a02] shadow-[0_6px_18px_color-mix(in_srgb,var(--brand-accent)_38%,transparent)] hover:brightness-[0.97] hover:shadow-[0_10px_26px_color-mix(in_srgb,var(--brand-accent)_45%,transparent)] active:scale-[0.98] focus-visible:ring-[var(--brand-accent)]",
        destructive:
          "bg-destructive text-white shadow-sm hover:bg-destructive/90 active:scale-[0.98]",
        outline:
          "border border-[var(--border-soft)] bg-[var(--surface)] shadow-[var(--shadow-sm)] hover:border-[color-mix(in_srgb,var(--brand-primary)_40%,var(--border-soft))] hover:bg-[var(--surface-2)] active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:scale-[0.98]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
        "ghost-brand":
          "text-[var(--brand-primary-hover)] hover:bg-[var(--brand-primary-muted)] active:scale-[0.98]",
        link:
          "text-[var(--brand-primary)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-[var(--radius-sm)] px-3 text-xs",
        lg: "h-11 rounded-[var(--radius-md)] px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
