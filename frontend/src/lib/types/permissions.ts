/** Permission keys + module groupings. Single source of truth for RBAC. */

export const PERMISSIONS = {
  "dashboard.view": "View main dashboard",

  "employees.view_list": "View employee directory",
  "employees.view_profile": "View individual employee profiles",
  "employees.create": "Add new employees",
  "employees.edit": "Edit employee information",
  "employees.delete": "Archive or delete employees",
  "employees.export": "Export employee data",
  "employees.manage_docs": "Upload and verify documents",

  "org_chart.view": "View org chart",

  "leave.view_own": "View own leave balance and history",
  "leave.view_team": "View team leave calendar",
  "leave.apply": "Submit leave requests",
  "leave.approve": "Approve or reject leave requests",
  "leave.configure": "Configure leave types and policies",

  "attendance.view_own": "View own attendance",
  "attendance.view_team": "View team attendance",
  "attendance.manage": "Edit and regularise attendance records",
  "attendance.configure": "Configure shifts and attendance rules",

  "payroll.view_own": "View own pay slips",
  "payroll.view_all": "View all employee payroll data",
  "payroll.run": "Execute payroll runs",
  "payroll.configure": "Configure salary structures",

  "performance.view_own": "View own goals and reviews",
  "performance.view_team": "View team performance",
  "performance.manage": "Manage review cycles and assessments",
  "performance.configure": "Configure performance frameworks",

  "reports.view": "View standard reports",
  "reports.export": "Export reports",
  "reports.create": "Build custom reports",

  // AI (Phase 10)
  "ai.chat": "Use the AI assistant",
  "ai.review_anomalies": "Review AI-flagged payroll and attendance signals",
  "ai.generate_documents": "Generate documents using AI drafting",

  // Navigation & Forms (Phase 12)
  "navigation.manage": "Customize sidebar navigation and visibility",
  "forms.create": "Build and publish custom forms",
  "forms.manage_all": "View and manage all custom form submissions",

  "settings.company.view": "View company settings",
  "settings.company.edit": "Edit company settings and branding",
  "settings.departments.manage": "Manage departments and designations",
  "settings.work_calendar.manage": "Manage shifts and holidays",
  "settings.roles.view": "View roles and permissions",
  "settings.roles.manage": "Create and edit custom roles",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export const SCOPED_PERMISSIONS: PermissionKey[] = [
  "employees.view_list",
  "employees.view_profile",
  "employees.edit",
  "employees.export",
  "leave.view_team",
  "leave.approve",
  "attendance.view_team",
  "attendance.manage",
  "performance.view_team",
  "performance.manage",
];

export const ALWAYS_GLOBAL_PERMISSIONS: PermissionKey[] = [
  "dashboard.view",
  "employees.create",
  "employees.delete",
  "employees.manage_docs",
  "org_chart.view",
  "leave.apply",
  "leave.configure",
  "attendance.configure",
  "payroll.view_all",
  "payroll.run",
  "payroll.configure",
  "performance.configure",
  "reports.view",
  "reports.export",
  "reports.create",
  "ai.chat",
  "ai.review_anomalies",
  "ai.generate_documents",
  "navigation.manage",
  "forms.create",
  "forms.manage_all",
  "settings.company.view",
  "settings.company.edit",
  "settings.departments.manage",
  "settings.work_calendar.manage",
  "settings.roles.view",
  "settings.roles.manage",
];

export const ALWAYS_SELF_PERMISSIONS: PermissionKey[] = [
  "leave.view_own",
  "attendance.view_own",
  "payroll.view_own",
  "performance.view_own",
];

export interface ModuleGroup {
  label: string;
  permissions: PermissionKey[];
}

export const MODULE_GROUPS: ModuleGroup[] = [
  {
    label: "Dashboard",
    permissions: ["dashboard.view"],
  },
  {
    label: "Employee Management",
    permissions: [
      "employees.view_list",
      "employees.view_profile",
      "employees.create",
      "employees.edit",
      "employees.delete",
      "employees.export",
      "employees.manage_docs",
      "org_chart.view",
    ],
  },
  {
    label: "Leave",
    permissions: ["leave.view_own", "leave.view_team", "leave.apply", "leave.approve", "leave.configure"],
  },
  {
    label: "Attendance",
    permissions: ["attendance.view_own", "attendance.view_team", "attendance.manage", "attendance.configure"],
  },
  {
    label: "Payroll",
    permissions: ["payroll.view_own", "payroll.view_all", "payroll.run", "payroll.configure"],
  },
  {
    label: "Performance",
    permissions: ["performance.view_own", "performance.view_team", "performance.manage", "performance.configure"],
  },
  {
    label: "Reports",
    permissions: ["reports.view", "reports.export", "reports.create"],
  },
  {
    label: "AI",
    permissions: ["ai.chat", "ai.review_anomalies", "ai.generate_documents"],
  },
  {
    label: "Navigation & Forms",
    permissions: ["navigation.manage", "forms.create", "forms.manage_all"],
  },
  {
    label: "Settings",
    permissions: [
      "settings.company.view",
      "settings.company.edit",
      "settings.departments.manage",
      "settings.work_calendar.manage",
      "settings.roles.view",
      "settings.roles.manage",
    ],
  },
];

export function isScoped(key: PermissionKey): boolean {
  return SCOPED_PERMISSIONS.includes(key);
}