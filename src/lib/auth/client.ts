import { createAuthClient } from 'better-auth/react'

const resolveBaseURL = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }

  return import.meta.env?.VITE_BETTER_AUTH_URL || 'http://localhost:3000'
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

