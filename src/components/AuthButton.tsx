import { Link } from '@tanstack/react-router'
import { authClient } from '../lib/auth'

export default function AuthButton() {
  const { data: session } = authClient.useSession()

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-300">
          {session.user.name || session.user.email}
        </span>
        <button
          onClick={() => authClient.signOut()}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
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
        className="text-slate-300 hover:text-white font-medium transition-colors"
      >
        Sign In
      </Link>
      <Link
        to="/auth/signup"
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
      >
        Get Started
      </Link>
    </div>
  )
}
