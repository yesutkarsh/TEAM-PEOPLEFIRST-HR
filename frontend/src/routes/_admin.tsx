/**
 * Super admin layout. Always Default Theme — never tenant vars.
 * Guards every /admin/* route except /admin/login.
 */
import { useEffect } from "react";
import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { AdminSidebar } from "@/lib/components/layout";
import { adminAuthStore } from "@/lib/store/auth";
import { adminApi, seedAdminDemoData } from "@/lib/api/admin";
import { resetToDefaultTheme } from "@/lib/themes/utils";

export const Route = createFileRoute("/_admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLoginRoute = pathname === "/admin/login";
  const admin = adminAuthStore.useSelector((s) => s);

  useEffect(() => {
    resetToDefaultTheme();
    seedAdminDemoData();
    // ensure metrics seed
    void adminApi.getPlatformMetrics();
  }, []);

  useEffect(() => {
    if (!isLoginRoute && !admin.token) {
      navigate({ to: "/admin/login" });
    }
  }, [isLoginRoute, admin.token, navigate]);

  if (isLoginRoute) {
    return (
      <div className="min-h-screen bg-[#F9F9F7] text-[#0A0A0A] font-sans antialiased">
        <Outlet />
      </div>
    );
  }

  if (!admin.token) return null;

  const onLogout = () => {
    adminAuthStore.signOut();
    navigate({ to: "/admin/login" });
  };

  return (
    <div className="min-h-screen flex bg-[#F9F9F7] font-sans antialiased text-[#0A0A0A]">
      <AdminSidebar adminName={admin.name ?? "Platform Admin"} onLogout={onLogout} />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
