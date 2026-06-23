import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard,
  BarChart3,
  Presentation,
  BookOpen,
  SlidersHorizontal,
  Menu,
  Plus,
  LogOut,
  Settings,
  LifeBuoy,
  PanelLeftClose,
  PanelLeft,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavHref = "/dashboard" | "/models" | "/pitch-decks" | "/academy" | "/assumptions";

type NavEntry = {
  icon: LucideIcon;
  label: string;
  href: NavHref;
  match: (path: string) => boolean;
};

const MAIN_NAV: NavEntry[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", match: (p) => p.startsWith("/dashboard") },
  { icon: BarChart3, label: "Models", href: "/models", match: (p) => p.startsWith("/models") },
  { icon: Presentation, label: "Decks", href: "/pitch-decks", match: (p) => p.startsWith("/pitch-decks") },
  { icon: BookOpen, label: "Academy", href: "/academy", match: (p) => p.startsWith("/academy") },
  { icon: SlidersHorizontal, label: "Assumptions", href: "/assumptions", match: (p) => p.startsWith("/assumptions") },
];

const FOOTER_NAV: Array<{ icon: LucideIcon; label: string; href: "/assumptions" | "/academy"; hint: string }> = [
  { icon: Settings, label: "Settings", href: "/assumptions", hint: "Benchmarks & assumptions" },
  { icon: LifeBuoy, label: "Support", href: "/academy", hint: "Help & guides" },
];

const STORAGE_KEY = "havamind:sidebar-collapsed";

function BrandMark({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary)] text-[15px] font-extrabold text-white shadow-[0_6px_16px_color-mix(in_srgb,var(--brand-primary)_35%,transparent)]"
        style={{ fontFamily: "var(--font-display)" }}
        aria-hidden
      >
        H
      </span>
      {!collapsed && (
        <span className="min-w-0">
          <span className="block truncate font-display text-[15px] font-extrabold leading-none tracking-[-0.02em] text-[var(--brand-ink)]">
            Havamind
          </span>
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary-hover)]">
            Founder Edition
          </span>
        </span>
      )}
    </div>
  );
}

function NavRow({
  to,
  label,
  hint,
  Icon,
  active,
  collapsed,
  groupId,
  onNavigate,
  reduceMotion,
}: {
  to: NavHref | "/assumptions" | "/academy";
  label: string;
  hint?: string;
  Icon: LucideIcon;
  active: boolean;
  collapsed: boolean;
  groupId: string;
  onNavigate: () => void;
  reduceMotion: boolean;
}) {
  return (
    <Link
      to={to}
      title={collapsed ? label : hint}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex min-h-10 items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-[var(--text-subheadline)] font-medium leading-none transition-colors duration-200",
        collapsed && "justify-center px-0",
        active
          ? "text-[var(--sidebar-active-fg)]"
          : "text-[var(--brand-muted)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--brand-ink)]"
      )}
    >
      {active && (
        <motion.span
          layoutId={`${groupId}-active`}
          layout={!reduceMotion}
          transition={{ type: "spring", bounce: 0.18, duration: 0.42 }}
          className="absolute inset-0 -z-10 rounded-[var(--radius-md)] bg-[var(--sidebar-active-bg)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand-primary)_22%,transparent)]"
          aria-hidden
        />
      )}
      <Icon
        className={cn("size-[18px] shrink-0", active ? "text-[var(--sidebar-active-fg)]" : "text-current")}
        strokeWidth={active ? 2.2 : 1.85}
        aria-hidden
      />
      {!collapsed && <span className="min-w-0 truncate">{label}</span>}
    </Link>
  );
}

function SidebarBody({
  collapsed,
  groupId,
  pathname,
  onNavigate,
  onSignOut,
  reduceMotion,
}: {
  collapsed: boolean;
  groupId: string;
  pathname: string;
  onNavigate: () => void;
  onSignOut: () => void;
  reduceMotion: boolean;
}) {
  return (
    <>
      <div className={cn("shrink-0 px-3 pt-1", collapsed ? "px-2" : "px-4")}>
        <BrandMark collapsed={collapsed} />
      </div>

      <div className={cn("shrink-0 pt-4", collapsed ? "px-2" : "px-4")}>
        <Link
          to="/models/new"
          onClick={onNavigate}
          title="Create a new model"
          className={cn(
            "flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--brand-primary)] text-[var(--text-subheadline)] font-semibold text-white shadow-[0_6px_16px_color-mix(in_srgb,var(--brand-primary)_32%,transparent)] transition-all duration-200 hover:bg-[var(--brand-primary-hover)] active:scale-[0.98]",
            collapsed ? "w-10" : "w-full"
          )}
        >
          <Plus className="size-4" strokeWidth={2.5} aria-hidden />
          {!collapsed && <span>New model</span>}
        </Link>
      </div>

      <div className={cn("min-h-0 flex-1 overflow-y-auto pt-5", collapsed ? "px-2" : "px-4")}>
        {!collapsed && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-muted)]">
            Workspace
          </p>
        )}
        <nav className="flex flex-col gap-1" aria-label="Main navigation">
          {MAIN_NAV.map((item) => (
            <NavRow
              key={item.href}
              to={item.href}
              label={item.label}
              hint={item.label}
              Icon={item.icon}
              active={item.match(pathname)}
              collapsed={collapsed}
              groupId={groupId}
              onNavigate={onNavigate}
              reduceMotion={reduceMotion}
            />
          ))}
        </nav>
      </div>

      <div className={cn("shrink-0 border-t border-[var(--sidebar-border)] pb-3 pt-3", collapsed ? "px-2" : "px-4")}>
        {!collapsed && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-muted)]">
            Account
          </p>
        )}
        <div className="flex flex-col gap-1">
          {FOOTER_NAV.map((item) => (
            <NavRow
              key={item.href}
              to={item.href}
              label={item.label}
              hint={item.hint}
              Icon={item.icon}
              active={pathname.startsWith(item.href)}
              collapsed={collapsed}
              groupId={`${groupId}-footer`}
              onNavigate={onNavigate}
              reduceMotion={reduceMotion}
            />
          ))}
          <button
            type="button"
            onClick={onSignOut}
            title="Sign out"
            className={cn(
              "flex min-h-10 items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-left text-[var(--text-subheadline)] font-medium leading-none text-[var(--brand-muted)] transition-colors duration-200 hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--brand-ink)]",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="size-[18px] shrink-0" strokeWidth={1.85} aria-hidden />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  const router = useRouter();
  const reduceMotion = useReducedMotion() ?? false;
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      collapsed ? "var(--sidebar-collapsed-width)" : "var(--sidebar-expanded-width)"
    );
  }, [collapsed]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  const closeMobile = () => setIsMobileOpen(false);

  const handleSignOut = async () => {
    await signOut();
    router.invalidate();
    router.navigate({ to: "/" });
  };

  const shellClass =
    "flex h-full flex-col gap-0 overflow-hidden border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] py-5";

  return (
    <>
      {/* Mobile trigger + drawer */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--brand-ink)] shadow-[var(--shadow-sm)] transition-transform duration-150 active:scale-95 md:hidden"
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[var(--sidebar-expanded-width)] gap-0 border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-0 py-5 sm:max-w-[var(--sidebar-expanded-width)]"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody
            collapsed={false}
            groupId="mobile"
            pathname={pathname}
            onNavigate={closeMobile}
            onSignOut={handleSignOut}
            reduceMotion={reduceMotion}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop fixed aside */}
      <aside
        aria-label="Sidebar"
        className={cn(
          shellClass,
          "fixed left-0 top-0 z-40 hidden w-[var(--sidebar-width)] transition-[width] duration-300 [transition-timing-function:var(--ease-out-quint)] md:flex"
        )}
      >
        <SidebarBody
          collapsed={collapsed}
          groupId="desktop"
          pathname={pathname}
          onNavigate={() => {}}
          onSignOut={handleSignOut}
          reduceMotion={reduceMotion}
        />
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-7 hidden size-6 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--brand-muted)] shadow-[var(--shadow-sm)] transition-colors hover:text-[var(--brand-ink)] md:flex"
        >
          {collapsed ? <PanelLeft className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
        </button>
      </aside>
    </>
  );
}
