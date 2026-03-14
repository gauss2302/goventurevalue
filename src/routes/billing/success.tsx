import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/billing/success")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard", search: { billing: "success" } });
  },
  component: () => null,
});
