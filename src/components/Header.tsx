import { Link } from '@tanstack/react-router'
import AuthButton from './AuthButton'

export default function Header() {
  return (
    <header className="bg-white border-b border-[var(--border-soft)] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link
              to="/"
              className="flex items-center gap-2 text-[var(--brand-primary)] hover:text-[#3F38A4] transition-colors"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span className="text-xl font-[var(--font-display)]">
                GoVentureValue
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <AuthButton />
          </div>
        </div>
      </div>
    </header>
  )
}
