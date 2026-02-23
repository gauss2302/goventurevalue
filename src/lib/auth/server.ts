import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

import { db } from '@/db/index'
import * as schema from '@/db/schema'
import { logger } from '@/lib/logger'

const baseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.VITE_BETTER_AUTH_URL ||
  'http://localhost:3000'

const secret =
  process.env.BETTER_AUTH_SECRET || 'change-me-in-production-secret-key'

if (process.env.NODE_ENV !== 'production') {
  logger.log('🔐 Better Auth Configuration:')
  logger.log('  - Base URL:', baseURL)
  logger.log('  - Secret:', secret ? '✅ Set' : '❌ Not set')
  logger.log(
    '  - Google Client ID:',
    process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Not set',
  )
  logger.log(
    '  - Google Client Secret:',
    process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Not set',
  )
  logger.log(
    '  - Database URL:',
    process.env.DATABASE_URL ? '✅ Set' : '❌ Not set',
  )
}

if (!process.env.BETTER_AUTH_SECRET) {
  logger.warn(
    '⚠️  BETTER_AUTH_SECRET is not set. Authentication may not work properly.',
  )
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
  return auth.api.getSession({ headers: headers || new Headers() })
}

