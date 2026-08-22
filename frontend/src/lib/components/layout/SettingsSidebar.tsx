/** Secondary sidebar shown inside /settings/* routes. */
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { usePermission } from "@/lib/hooks/usePermission";

const NAV = [
  { label: "Company & Branding", to: "/settings/company" },
  { label: "Departments", to: "/settings/company/departments" },
  { label: "Designations", to: "/settings/company/designations" },
  { label: "Work Calendar", to: "/settings/company/work-calendar" },
  { label: "Holidays", to: "/settings/company/holidays" },
];

const ROLES_NAV = [
  { label: "Roles", to: "/settings/roles" },
  { label: "Assignments", to: "/settings/roles/assignments" },
  { label: "Delegation", to: "/settings/roles/delegation" },
  { label: "Audit Log", to: "/settings/roles/audit" },
];

const MODULE_NAV = [
  { label: "Leave Types", to: "/settings/leave", permission: "leave.configure" },
  { label: "Leave Policies", to: "/settings/leave/policies", permission: "leave.configure" },
  { label: "Attendance Rules", to: "/settings/attendance", permission: "attendance.configure" },
  { label: "Salary Components", to: "/settings/payroll", permission: "payroll.configure" },
  { label: "Salary Structures", to: "/settings/payroll/structures", permission: "payroll.configure" },
] as const;

const HIRING_NAV = [
  { label: "Forms", to: "/settings/forms" },
  { label: "Rejection Reasons", to: "/settings/hiring/rejection-reasons" },
];

function ModuleNavItem({ item, pathname }: { item: (typeof MODULE_NAV)[number]; pathname: string }) {
  const allowed = usePermission(item.permission);
  if (!allowed) return null;
  const active = pathname === item.to;
  return (
    <li>
      <Link
        to={item.to}
        className={cn(
          "block rounded-sm px-3 py-2 text-[13px] transition-colors",
          active ? "font-semibold bg-white border border-[#E5E5E3]" : "text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-white/60",
        )}
      >
        {item.label}
      </Link>
    </li>
  );
}

export function SettingsSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const canViewRoles = usePermission("settings.roles.view");
  return (
    <nav aria-label="Settings sections" className="w-56 shrink-0">
      <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6B6B6B]">Settings</p>
      <ul className="space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.to;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "block rounded-sm px-3 py-2 text-[13px] transition-colors",
                  active ? "font-semibold bg-white border border-[#E5E5E3]" : "text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-white/60",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      {canViewRoles && (
        <>
          <p className="px-3 mt-5 mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6B6B6B]">Roles &amp; Permissions</p>
          <ul className="space-y-0.5">
            {ROLES_NAV.map((item) => {
              const active = item.to === "/settings/roles"
                ? pathname === item.to || /^\/settings\/roles\/[^/]+/.test(pathname) && !pathname.startsWith("/settings/roles/assignments") && !pathname.startsWith("/settings/roles/delegation") && !pathname.startsWith("/settings/roles/audit") && !pathname.startsWith("/settings/roles/new")
                : pathname.startsWith(item.to);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={cn(
                      "block rounded-sm px-3 py-2 text-[13px] transition-colors",
                      active ? "font-semibold bg-white border border-[#E5E5E3]" : "text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-white/60",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <p className="px-3 mt-5 mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6B6B6B]">Hiring</p>
      <ul className="space-y-0.5">
        {HIRING_NAV.map((item) => {
          const active = pathname.startsWith(item.to);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "block rounded-sm px-3 py-2 text-[13px] transition-colors",
                  active ? "font-semibold bg-white border border-[#E5E5E3]" : "text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-white/60",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="px-3 mt-5 mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6B6B6B]">Modules</p>
      <ul className="space-y-0.5">
        {MODULE_NAV.map((item) => (
          <ModuleNavItem key={item.to} item={item} pathname={pathname} />
        ))}
      </ul>
    </nav>
  );
}
