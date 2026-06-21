import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  component: () => {
    if (typeof window !== "undefined") {
      window.location.replace("/admin/login");
    }
    return null;
  },
});
