import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

const isProduction = process.env.NODE_ENV === "production";

const cspDirectives = [
  "default-src 'self'",
  // React + TanStack Start hydration inlines a bootstrap script. Without nonces
  // we need 'unsafe-inline' here; tighten later by wiring nonces through SSR.
  "script-src 'self' 'unsafe-inline'",
  // React inline styles + Tailwind injected style blocks require 'unsafe-inline'.
  "style-src 'self' 'unsafe-inline'",
  // Users can paste/upload images (data: / blob:) and reference Unsplash photos.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // Browser fetches Unsplash CDN images for PDF export (fetchImageAsDataUrl).
  "connect-src 'self' https://images.unsplash.com https://*.unsplash.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
].join("; ");

const baseSecurityHeaders: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
};

const productionOnlyHeaders: Record<string, string> = {
  "Content-Security-Policy": cspDirectives,
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
};

const securityHeaders = isProduction
  ? { ...baseSecurityHeaders, ...productionOnlyHeaders }
  : baseSecurityHeaders;

export default createServerEntry({
  async fetch(request) {
    const response = await handler.fetch(request);
    for (const [key, value] of Object.entries(securityHeaders)) {
      if (!response.headers.has(key)) {
        response.headers.set(key, value);
      }
    }
    return response;
  },
});
