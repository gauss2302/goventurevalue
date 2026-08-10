import { Link } from '@tanstack/react-router'
import AuthButton from './AuthButton'

import { BRAND } from '@/config/brand'

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
            {BRAND.name}
          </span>
        </Link>
        <div className="flex items-center gap-5">
          {/* Both sides reachable from one place: a founder is often also job
              hunting, and membership is what separates the two (§6.6). */}
          <nav className="hidden items-center gap-4 text-sm sm:flex">
            <Link
              to="/jobs"
              className="text-[var(--brand-muted)] transition-colors hover:text-[var(--brand-ink)]"
              activeProps={{ className: 'font-medium text-[var(--brand-ink)]' }}
            >
              Roles
            </Link>
            <Link
              to="/applications"
              className="text-[var(--brand-muted)] transition-colors hover:text-[var(--brand-ink)]"
              activeProps={{ className: 'font-medium text-[var(--brand-ink)]' }}
            >
              Applications
            </Link>
            <Link
              to="/profile"
              className="text-[var(--brand-muted)] transition-colors hover:text-[var(--brand-ink)]"
              activeProps={{ className: 'font-medium text-[var(--brand-ink)]' }}
            >
              Profile
            </Link>
            <Link
              to="/company"
              className="text-[var(--brand-muted)] transition-colors hover:text-[var(--brand-ink)]"
              activeProps={{ className: 'font-medium text-[var(--brand-ink)]' }}
            >
              Hiring
            </Link>
            {/* One inbox for both sides of the product: a founder is often also
                job hunting (§6.6), and splitting it would hide half of it. */}
            <Link
              to="/notifications"
              className="text-[var(--brand-muted)] transition-colors hover:text-[var(--brand-ink)]"
              activeProps={{ className: 'font-medium text-[var(--brand-ink)]' }}
            >
              Updates
            </Link>
          </nav>
          <AuthButton />
        </div>
      </div>
    </header>
  )
}
