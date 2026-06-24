import { Link, useRouter } from "@tanstack/react-router";
import { CreditCard, LogOut, Settings, Sparkles } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

function getInitials(name: string | null, email: string | null) {
  return (
    name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    email?.slice(0, 2).toUpperCase() ||
    "HM"
  );
}

export function UserMenu({
  user,
  onUpgrade,
  onManagePlan,
  className,
}: {
  user: {
    name: string | null;
    email: string | null;
    plan: "free" | "pro";
  };
  onUpgrade?: () => void;
  onManagePlan?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const initials = getInitials(user.name, user.email);

  const handleSignOut = async () => {
    await signOut();
    router.invalidate();
    router.navigate({ to: "/" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "rounded-full outline-none ring-[var(--brand-primary)] transition-shadow focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page)]",
            className
          )}
          aria-label="Open account menu"
        >
          <Avatar className="size-9">
            <AvatarFallback className="bg-[var(--brand-primary-muted)] font-display text-[var(--text-caption1)] font-bold text-[var(--brand-primary-hover)]">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <p className="truncate text-[var(--text-subheadline)] font-semibold text-[var(--brand-ink)]">
              {user.name || "Founder"}
            </p>
            {user.email ? (
              <p className="truncate text-[var(--text-caption2)] font-normal text-[var(--brand-muted)]">
                {user.email}
              </p>
            ) : null}
            <p className="pt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-primary-hover)]">
              {user.plan === "pro" ? "Pro plan" : "Free plan"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/assumptions">
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>
        {user.plan === "pro" ? (
          <DropdownMenuItem onSelect={onManagePlan}>
            <CreditCard />
            Manage plan
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={onUpgrade}>
            <Sparkles />
            Upgrade to Pro
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
