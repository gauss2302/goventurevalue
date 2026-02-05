import { createAuthClient } from 'better-auth/react'

const resolveBaseURL = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }

  return import.meta.env?.VITE_BETTER_AUTH_URL || 'http://localhost:3000'
}

const baseURL = resolveBaseURL()
const isMockAuth = import.meta.env?.VITE_MOCK_AUTH === 'true'

const mockUser = {
  id: 'mock-user',
  name: 'Demo User',
  email: 'demo@goventurevalue.com',
  image: null as string | null,
}

const mockSession = {
  user: mockUser,
  session: {
    token: 'mock-token',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  },
}

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: 'include',
  },
})

export const useSessionWithMock = () => {
  const clientSession = authClient.useSession()

  if (!isMockAuth) {
    return clientSession
  }

  return {
    ...clientSession,
    data: mockSession,
    error: null,
    isPending: false,
  }
}

export const signOutWithMock = () => {
  if (isMockAuth) {
    return Promise.resolve()
  }
  return authClient.signOut()
}

