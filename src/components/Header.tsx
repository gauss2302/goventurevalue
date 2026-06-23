import { Link } from '@tanstack/react-router'
import AuthButton from './AuthButton'

export default function Header() {
  return (
    <header
      role="banner"
      className="sticky top-0 z-40 h-14 border-b border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--surface)_82%,transparent)] backdrop-blur-xl"
    >
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-6">
        <Link
          to="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary)] text-[15px] font-extrabold text-white shadow-[0_6px_16px_color-mix(in_srgb,var(--brand-primary)_35%,transparent)]"
            style={{ fontFamily: 'var(--font-display)' }}
            aria-hidden
          >
            H
          </span>
          <span className="font-display text-lg font-extrabold tracking-[-0.02em] text-[var(--brand-ink)]">
            Havamind
          </span>
        </Link>
        <AuthButton />
      </div>
    </header>
  )
}
