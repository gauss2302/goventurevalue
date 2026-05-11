import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BarChart3,
  Presentation,
  BookOpen,
  SlidersHorizontal,
  Menu,
  X,
  Plus,
  LogOut,
  Settings,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

type NavEntry = {
  icon: LucideIcon;
  label: string;
  href: "/dashboard" | "/models" | "/pitch-decks" | "/academy" | "/assumptions";
  match: (path: string) => boolean;
};

const MAIN_NAV: NavEntry[] = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/dashboard",
    match: (p) => p.startsWith("/dashboard"),
  },
  {
    icon: BarChart3,
    label: "Models",
    href: "/models",
    match: (p) => p.startsWith("/models"),
  },
  {
    icon: Presentation,
    label: "Decks",
    href: "/pitch-decks",
    match: (p) => p.startsWith("/pitch-decks"),
  },
  {
    icon: BookOpen,
    label: "Academy",
    href: "/academy",
    match: (p) => p.startsWith("/academy"),
  },
  {
    icon: SlidersHorizontal,
    label: "Assumptions",
    href: "/assumptions",
    match: (p) => p.startsWith("/assumptions"),
  },
];

const FOOTER_NAV: Array<{
  icon: LucideIcon;
  label: string;
  href: "/assumptions" | "/academy";
  hint: string;
}> = [
  { icon: Settings, label: "Settings", href: "/assumptions", hint: "Benchmarks & assumptions" },
  { icon: LifeBuoy, label: "Support", href: "/academy", hint: "Help & guides" },
];

function NavRow({
  to,
  title,
  active,
  onNavigate,
  children,
}: {
  to: NavEntry["href"] | "/assumptions" | "/academy";
  title?: string;
  active: boolean;
  onNavigate: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      title={title}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-7 items-center gap-2 rounded-md px-2 py-1 text-xs font-medium leading-none transition-colors",
        active
          ? "bg-[#e8e4f9] text-[#2a14b4] shadow-[inset_2px_0_0_0_#2a14b4]"
          : "text-[#5c5a66] hover:bg-white/55 hover:text-[#0b1c30]"
      )}
    >
      {children}
    </Link>
  );
}

const asideShellClass =
  "flex h-full w-[var(--sidebar-expanded-width)] flex-col gap-0 overflow-hidden bg-[#eff4ff]";

export function Sidebar() {
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-width", "var(--sidebar-expanded-width)");
  }, []);

  const closeMobile = () => setIsMobileOpen(false);

  const handleSignOut = async () => {
    await signOut();
    router.invalidate();
    router.navigate({ to: "/" });
  };

  const shell = (
    <>
      <div className="shrink-0 px-3 pb-3 pt-1 md:pt-0">
        <p
          className="text-base font-extrabold leading-tight tracking-tight text-[#0b1c30]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Havamind
        </p>
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-primary)]">
          Founder Edition
        </p>
      </div>

      <div className="shrink-0 px-3 pb-3">
        <Link
          to="/models/new"
          onClick={closeMobile}
          className="flex h-8 w-full items-center justify-center gap-1 rounded-md bg-[#4338ca] text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-95 active:opacity-90"
        >
          New model
          <Plus className="size-3.5" strokeWidth={2.5} aria-hidden />
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3">
        <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-[#8b8994]">
          Workspace
        </p>
        <nav className="flex flex-col gap-px" aria-label="Main navigation">
          {MAIN_NAV.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <NavRow
                key={item.href}
                to={item.href}
                title={item.label}
                active={active}
                onNavigate={closeMobile}
              >
                <Icon
                  className={cn("size-4 shrink-0", active ? "text-[#2a14b4]" : "text-[#6b6a76]")}
                  strokeWidth={active ? 2 : 1.75}
                  aria-hidden
                />
                <span className="min-w-0 truncate">{item.label}</span>
              </NavRow>
            );
          })}
        </nav>
      </div>

      <div className="shrink-0 border-t border-[#dfe7f7]/80 px-3 pb-3 pt-2">
        <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-[#8b8994]">
          Account
        </p>
        <div className="flex flex-col gap-px">
          {FOOTER_NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <NavRow
                key={item.href}
                to={item.href}
                title={item.hint}
                active={active}
                onNavigate={closeMobile}
              >
                <Icon className="size-4 shrink-0 text-[#6b6a76]" strokeWidth={1.75} aria-hidden />
                <span className="min-w-0 truncate">{item.label}</span>
              </NavRow>
            );
          })}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex min-h-7 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs font-medium leading-none text-[#5c5a66] transition-colors hover:bg-white/55 hover:text-[#0b1c30]"
          >
            <LogOut className="size-4 shrink-0 text-[#6b6a76]" strokeWidth={1.75} aria-hidden />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-[#eeedf3] bg-white text-[#0b1c30] shadow-sm transition-transform duration-150 active:scale-95 md:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label="Toggle sidebar"
      >
        {isMobileOpen ? <X size={17} /> : <Menu size={17} />}
      </button>

      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={closeMobile}
          />
        )}
      </AnimatePresence>

      <aside aria-label="Sidebar" className={`${asideShellClass} fixed left-0 top-0 z-40 hidden py-5 md:flex`}>
        {shell}
      </aside>

      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.32 }}
            className={`${asideShellClass} fixed left-0 top-0 z-50 overflow-y-auto py-5 shadow-xl md:hidden`}
            aria-label="Sidebar"
          >
            {shell}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
