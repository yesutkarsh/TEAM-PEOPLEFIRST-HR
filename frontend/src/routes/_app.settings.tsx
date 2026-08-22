/** Settings layout: secondary sidebar + content area. */
import { Outlet, createFileRoute, redirect, useRouterState } from "@tanstack/react-router";
import { SettingsSidebar } from "@/lib/components/layout";

export const Route = createFileRoute("/_app/settings")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/settings") throw redirect({ to: "/settings/company" });
  },
  component: SettingsLayout,
});

function SettingsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-[28px] font-bold tracking-[-0.01em] mb-1">Company settings</h1>
      <p className="text-[14px] text-[#6B6B6B] mb-6">Configure how your workspace works.</p>
      <div className="flex flex-col md:flex-row gap-8">
        <SettingsSidebar />
        <div className="flex-1 min-w-0" data-current={pathname}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
