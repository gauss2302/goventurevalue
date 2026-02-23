import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

import { db } from '@/db/index'
import * as schema from '@/db/schema'

const getOptionalEnv = (key: string) => {
  const value = process.env[key]
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const requireEnv = (key: string) => {
  const value = getOptionalEnv(key)
  if (!value) {
    throw new Error(`[Auth] Missing required environment variable: ${key}`)
  }
  return value
}

const baseURL =
  getOptionalEnv('BETTER_AUTH_URL') ?? getOptionalEnv('VITE_BETTER_AUTH_URL')

if (!baseURL) {
  throw new Error(
    '[Auth] Missing BETTER_AUTH_URL (or VITE_BETTER_AUTH_URL) environment variable.',
  )
}

const secret = requireEnv('BETTER_AUTH_SECRET')

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
