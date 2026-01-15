import { auth } from "@/lib/auth";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          const url = new URL(request.url);
          console.log("[Better Auth] GET request to:", url.pathname);
          const response = await auth.handler(request);
          return response;
        } catch (error) {
          console.error("[Better Auth] GET error:", error);
          console.error(
            "[Better Auth] Error stack:",
            error instanceof Error ? error.stack : "No stack"
          );
          // Return the error response from Better Auth if available
          if (error instanceof Response) {
            return error;
          }
          return new Response(
            JSON.stringify({
              error: "Authentication error",
              message: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
      POST: async ({ request }: { request: Request }) => {
        try {
          const url = new URL(request.url);
          console.log("[Better Auth] POST request to:", url.pathname);

          // Clone request to read body for debugging (Better Auth will handle the original)
          const clonedRequest = request.clone();
          try {
            const body = await clonedRequest.text();
            if (body) {
              console.log(
                "[Better Auth] Request body:",
                body.substring(0, 200)
              );
            }
          } catch (e) {
            // Ignore body reading errors
          }

          const response = await auth.handler(request);
          console.log("[Better Auth] Response status:", response.status);
          return response;
        } catch (error) {
          console.error("[Better Auth] POST error:", error);
          console.error(
            "[Better Auth] Error stack:",
            error instanceof Error ? error.stack : "No stack"
          );
          // Return the error response from Better Auth if available
          if (error instanceof Response) {
            return error;
          }
          return new Response(
            JSON.stringify({
              error: "Authentication error",
              message: error instanceof Error ? error.message : String(error),
            }),
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
