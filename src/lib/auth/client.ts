import { createAuthClient } from 'better-auth/react'

const resolveBaseURL = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }

  const configuredUrl =
    import.meta.env?.VITE_BETTER_AUTH_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim()
  if (configuredUrl) {
    return configuredUrl
  }

  throw new Error(
    '[Auth] Missing VITE_BETTER_AUTH_URL while resolving auth client base URL.',
  )
}

const baseURL = resolveBaseURL()

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: 'include',
  },
})

export async function signOut() {
  await authClient.signOut()
}
