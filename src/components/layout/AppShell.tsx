import { type ReactNode } from "react";

import { Sidebar } from "@/components/Sidebar";

/**
 * Authenticated app shell: fixed sidebar plus a content column offset by the
 * sidebar width. Replaces the Sidebar + `md:ml-[var(--sidebar-width)]` markup
 * that was duplicated across every authenticated route.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[var(--page)] text-[var(--brand-ink)]">
      <Sidebar />
      <div className="relative transition-[margin] duration-300 [transition-timing-function:var(--ease-out-quint)] md:ml-[var(--sidebar-width)]">
        {children}
      </div>
    </div>
  );
}
