import { Link, useRouter } from '@tanstack/react-router'
import { signOutWithMock, useSessionWithMock } from '@/lib/auth/client'

export default function AuthButton() {
  const { data: session } = useSessionWithMock()
  const router = useRouter()

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-[var(--brand-muted)]">
          {session.user.name || session.user.email}
        </span>
        <button
          onClick={async () => {
            await signOutWithMock()
            router.invalidate()
            router.navigate({ to: '/' })
          }}
          className="px-4 py-2 bg-[var(--brand-secondary)] hover:bg-[#E47861] text-white rounded-lg transition-colors"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        to="/auth/signin"
        className="text-[var(--brand-muted)] hover:text-[var(--brand-primary)] font-medium transition-colors"
      >
        Sign In
      </Link>
      <Link
        to="/auth/signup"
        className="px-4 py-2 bg-[var(--brand-primary)] hover:bg-[#3F38A4] text-white rounded-lg transition-colors font-medium"
      >
        Get Started
      </Link>
    </div>
  )
}
