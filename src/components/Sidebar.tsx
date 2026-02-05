import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FileSpreadsheet,
  BookOpen,
  Library,
  Menu,
  X,
  Plus,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { signOutWithMock } from "@/lib/auth/client";

export function Sidebar() {
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem("sidebar-collapsed") === "true";
  });
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/dashboard",
      isActive: pathname.startsWith("/dashboard"),
    },
    {
      icon: FileSpreadsheet,
      label: "My Models",
      href: "/models",
      isActive: pathname.startsWith("/models"),
    },
    {
      icon: BookOpen,
      label: "Academy",
      href: "/academy",
      isActive: pathname.startsWith("/academy"),
    },
    {
      icon: Library,
      label: "Assumptions",
      href: "/assumptions",
      isActive: pathname.startsWith("/assumptions"),
    },
  ];

  useEffect(() => {
    const width = isCollapsed
      ? "var(--sidebar-collapsed-width)"
      : "var(--sidebar-expanded-width)";
    document.documentElement.style.setProperty("--sidebar-width", width);
    window.localStorage.setItem("sidebar-collapsed", String(isCollapsed));
  }, [isCollapsed]);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white text-[var(--brand-primary)] rounded-full border border-[var(--border-soft)] shadow-sm"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        className="fixed top-0 left-0 h-screen bg-white border-r border-[var(--border-soft)] hidden md:flex flex-col z-40"
        initial={false}
        animate={{ width: isCollapsed ? "5rem" : "18rem" }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
      >
        {/* Logo */}
        <div className="relative px-4 py-6">
          <button
            className="absolute right-4 top-4 flex items-center justify-center h-8 w-8 rounded-full border border-[var(--border-soft)] text-[var(--brand-muted)] hover:text-[var(--brand-primary)] bg-white"
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
            <div className="relative">
              <div
                className={`${
                  isCollapsed ? "w-10 h-10 text-base" : "w-12 h-12 text-lg"
                } bg-[var(--brand-primary)] rounded-xl flex items-center justify-center text-white font-[var(--font-display)] shadow-[0_12px_24px_rgba(79,70,186,0.25)]`}
              >
                GV
              </div>
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-[var(--brand-accent)] rounded-full shadow-sm" />
            </div>
            {!isCollapsed && (
              <div className="leading-tight">
                <div className="text-lg font-[var(--font-display)] text-[var(--brand-ink)]">
                  GoVenture
                </div>
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">
                  Valuation Lab
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                item.isActive
                  ? "bg-[rgba(79,70,186,0.12)] text-[var(--brand-primary)]"
                  : "text-[rgba(28,30,47,0.7)] hover:text-[var(--brand-primary)] hover:bg-[rgba(79,70,186,0.08)]"
              }`}
            >
              <item.icon size={20} />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="px-4 pb-6 space-y-3">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-[var(--border-soft)] text-[rgba(28,30,47,0.8)] hover:text-[var(--brand-primary)] hover:border-[rgba(79,70,186,0.3)] transition-all">
            <span className="w-8 h-8 rounded-full bg-[rgba(132,232,244,0.5)] text-[var(--brand-primary)] flex items-center justify-center">
              <Plus size={16} />
            </span>
            {!isCollapsed && (
              <span className="text-sm font-semibold">Invite a member</span>
            )}
          </button>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[var(--brand-muted)] hover:text-[var(--brand-secondary)] hover:bg-[rgba(249,137,107,0.08)] transition-all"
            onClick={async () => {
              await signOutWithMock();
              router.invalidate();
              router.navigate({ to: "/" });
            }}
          >
            <LogOut size={18} />
            {!isCollapsed && (
              <span className="text-sm font-semibold">Sign out</span>
            )}
          </button>
        </div>
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="fixed top-0 left-0 h-screen w-72 bg-white border-r border-[var(--border-soft)] z-50 md:hidden flex flex-col"
          >
            <div className="px-6 py-6 border-b border-[var(--border-soft)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--brand-primary)] rounded-xl flex items-center justify-center text-white font-[var(--font-display)] text-base shadow-[0_12px_24px_rgba(79,70,186,0.25)]">
                  GV
                </div>
                <div>
                  <div className="font-[var(--font-display)] text-base text-[var(--brand-ink)]">
                    GoVenture
                  </div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">
                    Valuation Lab
                  </div>
                </div>
              </div>
            </div>

            <nav className="flex-1 py-6 px-4 space-y-2">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                    item.isActive
                      ? "bg-[rgba(79,70,186,0.12)] text-[var(--brand-primary)]"
                      : "text-[rgba(28,30,47,0.7)] hover:text-[var(--brand-primary)] hover:bg-[rgba(79,70,186,0.08)]"
                  }`}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="px-4 pb-6 space-y-3 border-t border-[var(--border-soft)] pt-4">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-[var(--border-soft)] text-[rgba(28,30,47,0.8)] hover:text-[var(--brand-primary)] hover:border-[rgba(79,70,186,0.3)] transition-all">
                <span className="w-8 h-8 rounded-full bg-[rgba(132,232,244,0.5)] text-[var(--brand-primary)] flex items-center justify-center">
                  <Plus size={16} />
                </span>
                <span className="text-sm font-semibold">Invite a member</span>
              </button>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[var(--brand-muted)] hover:text-[var(--brand-secondary)] hover:bg-[rgba(249,137,107,0.08)] transition-all"
                onClick={async () => {
                  await signOutWithMock();
                  setIsMobileOpen(false);
                  router.invalidate();
                  router.navigate({ to: "/" });
                }}
              >
                <LogOut size={18} />
                <span className="text-sm font-semibold">Sign out</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
