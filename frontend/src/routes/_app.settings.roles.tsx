/** Roles & Permissions layout — secondary horizontal nav. */
import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { PermissionGuard } from "@/lib/components/rbac";
import { Alert } from "@/lib/components/ui";

export const Route = createFileRoute("/_app/settings/roles")({
  component: RolesLayout,
  head: () => ({ meta: [{ title: "Roles & Permissions — Settings — HRMS" }] }),
});

const TABS = [
  { label: "Roles", to: "/settings/roles" },
  { label: "Assignments", to: "/settings/roles/assignments" },
  { label: "Delegation", to: "/settings/roles/delegation" },
  { label: "Audit Log", to: "/settings/roles/audit" },
];

function RolesLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <PermissionGuard
      permission="settings.roles.view"
      fallback={<Alert variant="error">You don't have access to Roles &amp; Permissions.</Alert>}
    >
      <div className="space-y-5">
        <div>
          <h2 className="text-[22px] font-bold tracking-[-0.01em]">Roles &amp; Permissions</h2>
          <p className="text-[13px] text-[#6B6B6B] mt-0.5">Control what each person can see and do in your HRMS.</p>
        </div>
        <nav className="flex gap-1 border-b border-[#E5E5E3]" aria-label="Roles sections">
          {TABS.map((t) => {
            const active = t.to === "/settings/roles"
              ? pathname === t.to || /^\/settings\/roles\/[^/]+/.test(pathname) && !pathname.startsWith("/settings/roles/assignments") && !pathname.startsWith("/settings/roles/delegation") && !pathname.startsWith("/settings/roles/audit") && !pathname.startsWith("/settings/roles/new")
              : pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "px-3 py-2 text-[13px] -mb-px border-b-2 transition-colors",
                  active ? "border-[var(--tenant-primary)] text-[var(--tenant-primary)] font-medium" : "border-transparent text-[#6B6B6B] hover:text-[#0A0A0A]",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <Outlet />
      </div>
    </PermissionGuard>
  );
}