import { createFileRoute } from "@tanstack/react-router";

import { handleAuthRequest } from "@/lib/auth/server";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      // Error handling lives in handleAuthRequest so both verbs behave
      // identically and the auth instance stays per-request.
      GET: ({ request }: { request: Request }) => handleAuthRequest(request),
      POST: ({ request }: { request: Request }) => handleAuthRequest(request),
    },
  },
});
