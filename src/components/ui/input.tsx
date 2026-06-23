import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-[var(--radius-md)] border border-input bg-[var(--surface)] px-3.5 py-2.5 text-[var(--text-body)] shadow-[var(--shadow-sm)] transition-[color,box-shadow,border-color] duration-200 file:border-0 file:bg-transparent file:text-[var(--text-subheadline)] file:font-medium file:text-foreground placeholder:text-[var(--brand-muted)] hover:border-[color-mix(in_srgb,var(--brand-primary)_30%,var(--input))] focus-visible:outline-none focus-visible:border-[var(--brand-primary)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--brand-primary)_35%,transparent)] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
