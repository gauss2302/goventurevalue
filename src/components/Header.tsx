import { Link } from '@tanstack/react-router'
import AuthButton from './AuthButton'

export default function Header() {
  return (
    <header
      role="banner"
      className="h-14 border-b border-[var(--border-soft)] bg-white"
    >
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-6">
        <Link
          to="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand-ink)]">
            <div className="grid grid-cols-2 gap-[3px]">
              <div className="h-[6px] w-[6px] rounded-full bg-[var(--brand-primary)]" />
              <div className="h-[6px] w-[6px] rounded-full bg-[var(--brand-ink)]" />
              <div className="h-[6px] w-[6px] rounded-full bg-[var(--brand-primary)]" />
              <div className="h-[6px] w-[6px] rounded-full bg-[var(--brand-primary)]" />
            </div>
          </div>
          <span
            className="text-lg font-bold tracking-tight text-[var(--brand-ink)]"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
          >
            Havamind
          </span>
        </Link>
        <AuthButton />
      </div>
    </header>
  )
}
