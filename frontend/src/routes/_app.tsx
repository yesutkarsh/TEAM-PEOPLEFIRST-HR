/**
 * Authenticated app shell.
 * - Guards routes (redirects to /login if no session)
 * - Applies the tenant theme on mount and on any theme change
 * - Shows the persistent impersonation banner when an impersonation token is set
 * - Resets to default theme on logout
 */
import { useEffect, useState } from "react";
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Sidebar, TopBar, ImpersonationBanner, MobileBottomNav, RouteProgress, RouteTransition, GlobalSearchModal } from "@/lib/components/layout";
import { AiChatPanel } from "@/lib/components/ai";
import { authStore, impersonationStateStore } from "@/lib/store/auth";
import { tenantStore } from "@/lib/store/tenant";
import { rbacStore } from "@/lib/store/rbac";
import { applyTenantTheme, resetToDefaultTheme } from "@/lib/themes/utils";
import { authApi } from "@/lib/api/auth";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const user = authStore.useSelector((s) => s.user);
  const tenant = tenantStore.useSelector((s) => s.tenant);
  const theme = tenantStore.useSelector((s) => s.theme);
  const impersonation = impersonationStateStore.useSelector((s) => s.current);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Store-backed session lives in localStorage, so the server renders nothing.
  // Gate the first client render to match, avoiding a hydration mismatch.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // Auth guard
  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  // Hydrate RBAC for the logged-in user (covers page refresh where signIn didn't fire)
  useEffect(() => {
    if (user) rbacStore.refresh(user.id, user.role);
  }, [user]);

  // Apply tenant theme reactively
  useEffect(() => {
    applyTenantTheme(theme);
  }, [theme]);

  const onLogout = async () => {
    await authApi.logout();
    authStore.signOut();
    tenantStore.setTenant(null);
    impersonationStateStore.stop();
    resetToDefaultTheme();
    navigate({ to: "/login" });
  };

  if (!hydrated || !user || !tenant) return null;

  const roleLabel =
    user.role === "hr_admin" ? "HR Admin" : user.role === "manager" ? "Manager" : user.role === "super_admin" ? "Administrator" : "Employee";

  return (
    <div className="min-h-screen flex bg-[#F9F9F7] font-sans antialiased text-[#0A0A0A]">
      <RouteProgress />
      <Sidebar
        logoSrc={tenant.settings.logoDataUrl}
        companyName={impersonation?.companyName ?? tenant.settings.companyName}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <ImpersonationBanner />
        <TopBar
          userName={user.fullName}
          companyName={impersonation?.companyName ?? tenant.settings.companyName}
          roleLabel={roleLabel}
          onLogout={onLogout}
          onMenu={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 pb-24 md:pb-8">
          <RouteTransition>
            <Outlet />
          </RouteTransition>
        </main>
        <MobileBottomNav />
      </div>
      <AiChatPanel />
      <GlobalSearchModal />
    </div>
  );
}
