import { auth } from "../../../src/lib/auth";

// Nitro catch-all route for Better Auth
// This handles all nested paths under /api/auth/*
// Examples: /api/auth/sign-in/social, /api/auth/callback/social, etc.
// Better Auth's handler works with the Node.js request object from Nitro
export default defineEventHandler(async (event) => {
  // Convert Nitro event to Web Request for Better Auth
  const url = getRequestURL(event);
  const headers = new Headers();
  
  // Copy headers from event
  for (const [key, value] of Object.entries(getHeaders(event))) {
    if (value) {
      headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
  }
  
  // Create a Web Request object
  const request = new Request(url.toString(), {
    method: event.method,
    headers: headers,
    body: event.method !== "GET" && event.method !== "HEAD" 
      ? await readRawBody(event).catch(() => null)
      : undefined,
  });
  
  return auth.handler(request);
});
