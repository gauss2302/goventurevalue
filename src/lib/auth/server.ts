import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { polar, checkout } from '@polar-sh/better-auth'
import { Polar } from '@polar-sh/sdk'

import { db } from '@/db/index'
import * as schema from '@/db/schema'
import { getOptionalEnv, requireEnv } from '@/lib/env'

const baseURL =
  getOptionalEnv('BETTER_AUTH_URL') ?? getOptionalEnv('VITE_BETTER_AUTH_URL')

if (!baseURL) {
  throw new Error(
    '[Auth] Missing BETTER_AUTH_URL (or VITE_BETTER_AUTH_URL) environment variable.',
  )
}

const normalizedBaseURL = baseURL.replace(/\/+$/, '')

const secret = requireEnv('BETTER_AUTH_SECRET')

const getAlternateSiteOrigin = (origin: string): string | null => {
  try {
    const url = new URL(origin)
    if (url.hostname.startsWith('www.')) {
      return `${url.protocol}//${url.hostname.slice(4)}`
    }
    return `${url.protocol}//www.${url.hostname}`
  } catch {
    return null
  }
}

// In dev, the app is served from localhost on a Vite-assigned port, which won't
// match the production `baseURL`. Trust localhost (any port) only in dev so the
// origin check passes without weakening production security.
const devTrustedOrigins = import.meta.env?.DEV
  ? ['http://localhost:*', 'http://127.0.0.1:*']
  : []

const productionAlternateOrigin = import.meta.env?.DEV
  ? null
  : getAlternateSiteOrigin(normalizedBaseURL)

const polarAccessToken = getOptionalEnv('POLAR_ACCESS_TOKEN')
const polarProductId = getOptionalEnv('POLAR_EXPORTS_PRODUCT_ID')
const polarSuccessUrl =
  getOptionalEnv('POLAR_SUCCESS_URL') ??
  `${baseURL.replace(/\/+$/, '')}/billing/success`
const polarCheckoutSlug = getOptionalEnv('POLAR_CHECKOUT_SLUG') ?? 'exports'

const polarPlugin =
  polarAccessToken && polarProductId && polarSuccessUrl
    ? polar({
        client: new Polar({
          accessToken: polarAccessToken,
          server: (() => {
            const v = getOptionalEnv('POLAR_SERVER')?.trim().toLowerCase()
            return v === 'production' ? 'production' : 'sandbox'
          })(),
        }),
        createCustomerOnSignUp: true,
        use: [
          checkout({
            products: [
              {
                productId: polarProductId,
                slug: polarCheckoutSlug,
              },
            ],
            successUrl: polarSuccessUrl,
            authenticatedUsersOnly: true,
          }),
        ],
      })
    : null

export const auth = betterAuth({
  baseURL: normalizedBaseURL,
  secret,
  trustedOrigins: [
    normalizedBaseURL,
    ...(productionAlternateOrigin ? [productionAlternateOrigin] : []),
    ...devTrustedOrigins,
  ],
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema,
  }),
  socialProviders: {
    google: {
      clientId: requireEnv('GOOGLE_CLIENT_ID'),
      clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
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
  plugins: [tanstackStartCookies(), ...(polarPlugin ? [polarPlugin] : [])],
})

export const getServerSession = async (headers?: Headers) => {
  return auth.api.getSession({ headers: headers || new Headers() })
}

export const requireAuthFromHeaders = async (headers: Headers) => {
  const session = await getServerSession(headers)
  if (!session?.user) {
    throw new Error('Unauthorized')
  }
  return session
}
