import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

import { db } from '@/db/index'
import * as schema from '@/db/schema'

const baseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.VITE_BETTER_AUTH_URL ||
  'http://localhost:3000'

const isMockAuth = process.env.MOCK_AUTH === 'true'

const secret =
  process.env.BETTER_AUTH_SECRET ||
  (isMockAuth
    ? 'dev-secret-key-change-in-production'
    : 'change-me-in-production-secret-key')

if (process.env.NODE_ENV !== 'production') {
  console.log('🔐 Better Auth Configuration:')
  console.log('  - Base URL:', baseURL)
  console.log('  - Mock Auth:', isMockAuth)
  console.log('  - Secret:', secret ? '✅ Set' : '❌ Not set')
  console.log(
    '  - Google Client ID:',
    process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Not set',
  )
  console.log(
    '  - Google Client Secret:',
    process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Not set',
  )
  console.log('  - Database URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set')
}

if (!secret && !isMockAuth) {
  console.warn(
    '⚠️  BETTER_AUTH_SECRET is not set. Authentication may not work properly.',
  )
}

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

export const auth = betterAuth({
  baseURL,
  secret,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  plugins: [tanstackStartCookies()],
})

export const getServerSession = async (headers?: Headers) => {
  if (isMockAuth) {
    return mockSession
  }

  return auth.api.getSession({ headers: headers || new Headers() })
}

