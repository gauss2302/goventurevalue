import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FileSpreadsheet,
  Presentation,
  BookOpen,
  Library,
  Menu,
  X,
  Plus,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { signOut } from "@/lib/auth/client";

export function Sidebar() {
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("sidebar-collapsed") === "true";
  });
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", isActive: pathname.startsWith("/dashboard") },
    { icon: FileSpreadsheet, label: "My Models", href: "/models", isActive: pathname.startsWith("/models") },
    { icon: Presentation, label: "Pitch Decks", href: "/pitch-decks", isActive: pathname.startsWith("/pitch-decks") },
    { icon: BookOpen, label: "Academy", href: "/academy", isActive: pathname.startsWith("/academy") },
    { icon: Library, label: "Assumptions", href: "/assumptions", isActive: pathname.startsWith("/assumptions") },
  ];

  useEffect(() => {
    const width = isCollapsed
      ? "var(--sidebar-collapsed-width)"
      : "var(--sidebar-expanded-width)";
    document.documentElement.style.setProperty("--sidebar-width", width);
    window.localStorage.setItem("sidebar-collapsed", String(isCollapsed));
  }, [isCollapsed]);

  const handleSignOut = async () => {
    await signOut();
    router.invalidate();
    router.navigate({ to: "/" });
  };

  const navItemClass = (active: boolean) =>
    `flex items-center gap-2.5 px-3 min-h-[40px] rounded-lg transition-all duration-200 active:scale-[0.97] ${
      active
        ? "bg-[var(--brand-primary)]/8 text-[var(--brand-primary)] font-medium"
        : "text-[var(--brand-muted)] hover:text-[var(--brand-ink)] hover:bg-[var(--surface-2)]"
    }`;

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed left-3 top-3 z-50 flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-white text-[var(--brand-ink)] shadow-sm transition-transform duration-150 active:scale-95 md:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label="Toggle sidebar"
      >
        {isMobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        aria-label="Sidebar"
        className="fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-[var(--border-soft)] bg-white md:flex"
        initial={false}
        animate={{ width: isCollapsed ? "4rem" : "14rem" }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
      >
        {/* Logo area: toggle in flow so it doesn't overlay */}
        <div
          className={`flex px-3 py-3 ${isCollapsed ? "flex-col items-center gap-2" : "flex-row items-center gap-2.5"}`}
        >
          <div className={`flex min-w-0 flex-1 items-center gap-2.5 ${isCollapsed ? "justify-center" : ""}`}>
            <div
              className={`${
                isCollapsed ? "h-8 w-8" : "h-9 w-9"
              } flex shrink-0 items-center justify-center rounded-lg bg-[var(--brand-ink)]`}
            >
              <div className="grid grid-cols-2 gap-[2px]">
                <div className="h-[5px] w-[5px] rounded-full bg-[var(--brand-primary)]" />
                <div className="h-[5px] w-[5px] rounded-full bg-[var(--brand-ink)]" />
                <div className="h-[5px] w-[5px] rounded-full bg-[var(--brand-primary)]" />
                <div className="h-[5px] w-[5px] rounded-full bg-[var(--brand-primary)]" />
              </div>
            </div>
            {!isCollapsed && (
              <div className="min-w-0 leading-tight">
                <div
                  className="truncate text-sm font-bold text-[var(--brand-ink)]"
                  style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
                >
                  Havamind
                </div>
                <div className="truncate text-[10px] uppercase tracking-wider text-[var(--brand-muted)]">
                  Financial modeling
                </div>
              </div>
            )}
          </div>
          <button
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--border-soft)] bg-white text-[var(--brand-muted)] transition-colors hover:text-[var(--brand-ink)]"
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-2.5 pt-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              to={item.href as any}
              title={isCollapsed ? item.label : undefined}
              className={navItemClass(item.isActive)}
            >
              <item.icon size={16} className="shrink-0" />
              {!isCollapsed && <span className="truncate text-[13px]">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="space-y-1 px-2.5 pb-3">
          <button className="flex w-full items-center gap-2.5 rounded-lg border border-[var(--border-soft)] px-3 py-2 text-[var(--brand-muted)] transition-colors hover:border-[var(--brand-primary)]/30 hover:text-[var(--brand-primary)]">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
              <Plus size={12} />
            </span>
            {!isCollapsed && (
              <span className="truncate text-[12px] font-medium">Invite</span>
            )}
          </button>
          <button
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[var(--brand-muted)] transition-all hover:bg-red-50 hover:text-red-600"
            onClick={handleSignOut}
          >
            <LogOut size={14} />
            {!isCollapsed && (
              <span className="truncate text-[12px] font-medium">Sign out</span>
            )}
          </button>
        </div>
      </motion.aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-[var(--border-soft)] bg-white md:hidden"
            aria-label="Sidebar"
          >
            <div className="border-b border-[var(--border-soft)] px-4 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-ink)]">
                  <div className="grid grid-cols-2 gap-[2px]">
                    <div className="h-[5px] w-[5px] rounded-full bg-[var(--brand-primary)]" />
                    <div className="h-[5px] w-[5px] rounded-full bg-[var(--brand-ink)]" />
                    <div className="h-[5px] w-[5px] rounded-full bg-[var(--brand-primary)]" />
                    <div className="h-[5px] w-[5px] rounded-full bg-[var(--brand-primary)]" />
                  </div>
                </div>
                <div className="min-w-0">
                  <div
                    className="text-sm font-bold text-[var(--brand-ink)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Havamind
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--brand-muted)]">
                    Financial modeling
                  </div>
                </div>
              </div>
            </div>

            <nav className="flex-1 space-y-0.5 px-2.5 py-4">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href as any}
                  onClick={() => setIsMobileOpen(false)}
                  className={navItemClass(item.isActive)}
                >
                  <item.icon size={16} className="shrink-0" />
                  <span className="truncate text-[13px]">{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="space-y-1 border-t border-[var(--border-soft)] px-2.5 pb-4 pt-3">
              <button className="flex w-full items-center gap-2.5 rounded-lg border border-[var(--border-soft)] px-3 py-2 text-[var(--brand-muted)] transition-colors hover:border-[var(--brand-primary)]/30 hover:text-[var(--brand-primary)]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                  <Plus size={12} />
                </span>
                <span className="text-[12px] font-medium">Invite</span>
              </button>
              <button
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[var(--brand-muted)] transition-all hover:bg-red-50 hover:text-red-600"
                onClick={async () => {
                  await signOut();
                  setIsMobileOpen(false);
                  router.invalidate();
                  router.navigate({ to: "/" });
                }}
              >
                <LogOut size={14} />
                <span className="text-[12px] font-medium">Sign out</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
