import { auth } from "@/lib/auth/server";
import { createFileRoute } from "@tanstack/react-router";
import { logger } from "@/lib/logger";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          const response = await auth.handler(request);
          return response;
        } catch (error) {
          logger.error("[Better Auth] GET error:", error);
          logger.error(
            "[Better Auth] Error stack:",
            error instanceof Error ? error.stack : "No stack"
          );
          // Return the error response from Better Auth if available
          if (error instanceof Response) {
            return error;
          }
          return new Response(
            JSON.stringify({ error: "Authentication error" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
      POST: async ({ request }: { request: Request }) => {
        try {
          const response = await auth.handler(request);
          return response;
        } catch (error) {
          logger.error("[Better Auth] POST error:", error);
          logger.error(
            "[Better Auth] Error stack:",
            error instanceof Error ? error.stack : "No stack"
          );
          // Return the error response from Better Auth if available
          if (error instanceof Response) {
            return error;
          }
          return new Response(
            JSON.stringify({ error: "Authentication error" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
    },
  },
});
