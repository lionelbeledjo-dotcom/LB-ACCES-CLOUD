import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AdminSidebar, AdminMobileNav } from "@/components/AdminSidebar";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/admin") throw redirect({ to: "/admin/dashboard" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="min-h-screen flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminMobileNav />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

