import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/admin") throw redirect({ to: "/admin/dashboard" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  return <Outlet />;
}
