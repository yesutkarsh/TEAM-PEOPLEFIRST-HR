/**
 * JSON-driven, role-based navigation.
 *
 * A single declarative tree describes every destination in the product. Each
 * node lists the roles that may see it (`roles`) and, optionally, a permission
 * key so custom RBAC roles still narrow the menu further.
 *
 * To add a destination: add one entry here. Nothing else in the UI changes.
 */
import type { Role } from "@/lib/types/user";
import type { PermissionKey } from "@/lib/types/permissions";

export type NavIcon =
  | "home"
  | "users"
  | "userPlus"
  | "clock"
  | "calendar"
  | "wallet"
  | "target"
  | "megaphone"
  | "lifeBuoy"
  | "receipt"
  | "user"
  | "barChart"
  | "sparkles"
  | "settings";

export interface NavNode {
  label: string;
  to?: string;
  icon?: NavIcon;
  permission?: PermissionKey;
  roles: Role[];
  children?: NavNode[];
}

export interface NavGroup {
  label: string;
  roles: Role[];
  items: NavNode[];
}

const ALL: Role[] = ["hr_admin", "manager", "employee", "super_admin"];
const STAFF: Role[] = ["hr_admin", "manager", "super_admin"];
const HR: Role[] = ["hr_admin", "super_admin"];

export const NAV_CONFIG: NavGroup[] = [
  {
    label: "Workspace",
    roles: ALL,
    items: [
      { label: "Dashboard", to: "/dashboard", icon: "home", roles: ALL, permission: "dashboard.view" },
      {
        label: "Attendance",
        icon: "clock",
        roles: ALL,
        permission: "attendance.view_own",
        children: [
          { label: "My attendance", to: "/attendance", roles: ALL, permission: "attendance.view_own" },
          { label: "Regularisation", to: "/attendance/regularization", roles: ALL, permission: "attendance.view_own" },
          { label: "Team board", to: "/attendance/team", roles: STAFF, permission: "attendance.view_team" },
          { label: "Approvals", to: "/attendance/regularization/approvals", roles: STAFF, permission: "attendance.view_team" },
          { label: "Records", to: "/attendance/records", roles: HR, permission: "attendance.manage" },
        ],
      },
      {
        label: "Leave",
        icon: "calendar",
        roles: ALL,
        permission: "leave.view_own",
        children: [
          { label: "My leave", to: "/leave", roles: ALL, permission: "leave.view_own" },
          { label: "Apply", to: "/leave/apply", roles: ALL, permission: "leave.apply" },
          { label: "My requests", to: "/leave/requests", roles: ALL, permission: "leave.view_own" },
          { label: "Approvals", to: "/leave/approvals", roles: STAFF, permission: "leave.approve" },
          { label: "Team calendar", to: "/leave/calendar", roles: STAFF, permission: "leave.view_team" },
          { label: "Balances", to: "/leave/balances", roles: HR, permission: "leave.configure" },
        ],
      },
      {
        label: "Payroll",
        icon: "wallet",
        roles: ALL,
        permission: "payroll.view_own",
        children: [
          { label: "My payslips", to: "/payroll/payslips", roles: ALL, permission: "payroll.view_own" },
          { label: "Declarations", to: "/payroll/declarations", roles: ALL, permission: "payroll.view_own" },
          { label: "Overview", to: "/payroll", roles: HR, permission: "payroll.view_all" },
          { label: "Payroll runs", to: "/payroll/runs", roles: HR, permission: "payroll.run" },
        ],
      },
      {
        label: "Performance",
        icon: "target",
        roles: ALL,
        permission: "performance.view_own",
        children: [
          { label: "Dashboard", to: "/performance", roles: ALL, permission: "performance.view_own" },
          { label: "Goals", to: "/performance/goals", roles: ALL, permission: "performance.view_own" },
          { label: "Reviews", to: "/performance/reviews", roles: ALL, permission: "performance.view_own" },
          { label: "My team", to: "/performance/team", roles: STAFF, permission: "performance.view_team" },
          { label: "Cycles admin", to: "/performance/admin", roles: HR, permission: "performance.manage" },
          { label: "Calibration", to: "/performance/calibration", roles: HR, permission: "performance.manage" },
        ],
      },
    ],
  },
  {
    label: "People",
    roles: ALL,
    items: [
      {
        label: "Employees",
        icon: "users",
        roles: ALL,
        permission: "employees.view_list",
        children: [
          { label: "Directory", to: "/employees", roles: ALL, permission: "employees.view_list" },
          { label: "Org chart", to: "/org-chart", roles: ALL, permission: "org_chart.view" },
          { label: "Add employee", to: "/employees/new", roles: HR, permission: "employees.create" },
        ],
      },
      {
        label: "Hiring",
        icon: "userPlus",
        roles: HR,
        permission: "employees.view_list",
        children: [
          { label: "Candidates", to: "/candidates", roles: HR, permission: "employees.view_list" },
          { label: "Invite candidate", to: "/candidates/invite", roles: HR, permission: "employees.create" },
        ],
      },
    ],
  },
  {
    label: "Me & more",
    roles: ALL,
    items: [
      { label: "My profile", to: "/me", icon: "user", roles: ALL },
      { label: "My expenses", to: "/expenses", icon: "receipt", roles: ALL },
      { label: "Helpdesk", to: "/helpdesk", icon: "lifeBuoy", roles: ALL },
      { label: "Announcements", to: "/announcements", icon: "megaphone", roles: ALL },
      { label: "Reports", to: "/reports", icon: "barChart", roles: STAFF, permission: "reports.view" },
      { label: "AI Assistant", to: "/ai-assistant", icon: "sparkles", roles: ALL, permission: "ai.chat" },
    ],
  },
  {
    label: "Administration",
    roles: HR,
    items: [
      {
        label: "Settings",
        icon: "settings",
        roles: HR,
        permission: "settings.company.view",
        children: [
          { label: "Company & Branding", to: "/settings/company", roles: HR, permission: "settings.company.view" },
          { label: "Departments", to: "/settings/company/departments", roles: HR, permission: "settings.departments.manage" },
          { label: "Designations", to: "/settings/company/designations", roles: HR, permission: "settings.departments.manage" },
          { label: "Work Calendar", to: "/settings/company/work-calendar", roles: HR, permission: "settings.work_calendar.manage" },
          { label: "Holidays", to: "/settings/company/holidays", roles: HR, permission: "settings.work_calendar.manage" },
          { label: "Roles & Permissions", to: "/settings/roles", roles: HR, permission: "settings.roles.view" },
          { label: "Form Library", to: "/settings/forms", roles: HR, permission: "settings.company.view" },
        ],
      },
    ],
  },
];

/** Primary mobile destinations, per role. Max five — bottom nav is thumb-sized. */
export const MOBILE_NAV: Record<Role, { label: string; to: string; icon: NavIcon }[]> = {
  employee: [
    { label: "Home", to: "/dashboard", icon: "home" },
    { label: "Attendance", to: "/attendance", icon: "clock" },
    { label: "Leave", to: "/leave", icon: "calendar" },
    { label: "Pay", to: "/payroll/payslips", icon: "wallet" },
    { label: "Me", to: "/me", icon: "user" },
  ],
  manager: [
    { label: "Home", to: "/dashboard", icon: "home" },
    { label: "Team", to: "/attendance/team", icon: "users" },
    { label: "Approvals", to: "/leave/approvals", icon: "calendar" },
    { label: "Reviews", to: "/performance/team", icon: "target" },
    { label: "Me", to: "/me", icon: "user" },
  ],
  hr_admin: [
    { label: "Home", to: "/dashboard", icon: "home" },
    { label: "People", to: "/employees", icon: "users" },
    { label: "Leave", to: "/leave/approvals", icon: "calendar" },
    { label: "Payroll", to: "/payroll", icon: "wallet" },
    { label: "Me", to: "/me", icon: "user" },
  ],
  super_admin: [
    { label: "Home", to: "/dashboard", icon: "home" },
    { label: "People", to: "/employees", icon: "users" },
    { label: "Leave", to: "/leave/approvals", icon: "calendar" },
    { label: "Payroll", to: "/payroll", icon: "wallet" },
    { label: "Me", to: "/me", icon: "user" },
  ],
};

export function navForRole(role: Role | undefined): NavGroup[] {
  const r = role ?? "employee";
  return NAV_CONFIG.filter((g) => g.roles.includes(r))
    .map((g) => ({
      ...g,
      items: g.items
        .filter((i) => i.roles.includes(r))
        .map((i) => ({ ...i, children: i.children?.filter((c) => c.roles.includes(r)) }))
        .filter((i) => !i.children || i.children.length > 0),
    }))
    .filter((g) => g.items.length > 0);
}
