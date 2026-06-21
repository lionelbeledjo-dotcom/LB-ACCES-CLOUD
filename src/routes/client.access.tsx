import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/client/access")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
