export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-[var(--border-soft)] bg-[var(--surface)] py-10">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-6 md:flex-row lg:px-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-primary)] font-[var(--font-display)] text-sm text-white shadow-[0_12px_24px_rgba(79,70,186,0.25)]">
              GV
            </div>
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[var(--brand-accent)]" />
          </div>
          <div className="leading-tight">
            <p className="font-[var(--font-display)] text-[var(--brand-ink)]">
              GoVentureValue
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-muted)]">
              Valuation Lab
            </p>
          </div>
        </div>
        <p className="text-sm text-[var(--brand-muted)]">
          © {new Date().getFullYear()} GoVentureValue. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
