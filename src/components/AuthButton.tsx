import { Link, useRouter } from '@tanstack/react-router'
import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'

export default function AuthButton() {
  const { data: session } = authClient.useSession()
  const router = useRouter()

  if (session) {
    return (
      <div className="flex items-center gap-[var(--space-3)]">
        <span className="text-[var(--text-subheadline)] text-[var(--brand-muted)]">
          {session.user.name || session.user.email}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-[var(--border-soft)]"
          onClick={async () => {
            await authClient.signOut()
            router.invalidate()
            router.navigate({ to: '/' })
          }}
        >
          Sign Out
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-[var(--space-3)]">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/auth/signin">Sign In</Link>
      </Button>
      <Button variant="brand" size="sm" className="rounded-full" asChild>
        <Link to="/auth/signup">Get Started</Link>
      </Button>
    </div>
  )
}
