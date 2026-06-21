import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => {
    if (typeof window !== "undefined") {
      window.location.replace("/client/access");
    }
    return null;
  },
});
