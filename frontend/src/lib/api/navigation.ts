/**
 * Phase 12 — navigation configuration API (localStorage backed, frontend-only).
 *
 * The sidebar's hardcoded structure (Phases 2–10) stays the source of truth for
 * *what routes exist*. This module only layers configuration on top: display
 * order, per-role visibility, and additional custom top-level items.
 */
import type { ApiResponse } from "../types/api";
import type { SidebarItemConfig, SidebarSectionKey } from "../types/navigation";
import type { PermissionKey } from "../types/permissions";
import { BUILT_IN_ROLE_IDS } from "../types/rbac";
import { delay, fail, ok, uid } from "./client";

const CONFIG_KEY = "hrms.navConfig";

function read(): SidebarItemConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY);
    return raw ? (JSON.parse(raw) as SidebarItemConfig[]) : [];
  } catch {
    return [];
  }
}
function write(list: SidebarItemConfig[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONFIG_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("hrms:nav-config-changed"));
}

/** Top-level built-in sidebar items, mirroring the hardcoded Sidebar structure. */
export interface BuiltInNavItem {
  id: string;
  label: string;
  sectionKey: Exclude<SidebarSectionKey, "custom">;
  basePath: string;
  /** The Phase 4 permission that already governs this item. */
  permission?: PermissionKey;
  /** Whether this item already renders an expandable sub-nav. */
  hasSubNav: boolean;
}

export const BUILT_IN_NAV_ITEMS: BuiltInNavItem[] = [
  { id: "nav_dashboard", label: "Dashboard", sectionKey: "main", basePath: "/dashboard", permission: "dashboard.view", hasSubNav: false },
  { id: "nav_employees", label: "Employees", sectionKey: "main", basePath: "/employees", permission: "employees.view_list", hasSubNav: true },
  { id: "nav_attendance", label: "Attendance", sectionKey: "main", basePath: "/attendance", permission: "attendance.view_own", hasSubNav: true },
  { id: "nav_leave", label: "Leave", sectionKey: "main", basePath: "/leave", permission: "leave.view_own", hasSubNav: true },
  { id: "nav_payroll", label: "Payroll", sectionKey: "main", basePath: "/payroll", permission: "payroll.view_own", hasSubNav: true },
  { id: "nav_performance", label: "Performance", sectionKey: "main", basePath: "/performance", permission: "performance.view_own", hasSubNav: true },
  { id: "nav_announcements", label: "Announcements", sectionKey: "reports_ai", basePath: "/announcements", hasSubNav: false },
  { id: "nav_helpdesk", label: "Helpdesk", sectionKey: "reports_ai", basePath: "/helpdesk", hasSubNav: false },
  { id: "nav_expenses", label: "My expenses", sectionKey: "reports_ai", basePath: "/expenses", hasSubNav: false },
  { id: "nav_profile", label: "My profile", sectionKey: "reports_ai", basePath: "/me", hasSubNav: false },
  { id: "nav_reports", label: "Reports", sectionKey: "reports_ai", basePath: "/reports", permission: "reports.view", hasSubNav: false },
  { id: "nav_ai", label: "AI Assistant", sectionKey: "reports_ai", basePath: "/ai-assistant", permission: "ai.chat", hasSubNav: false },
  { id: "nav_settings", label: "Settings", sectionKey: "administration", basePath: "/settings", permission: "settings.company.view", hasSubNav: true },
];

const ALL_BUILT_IN_ROLES = [BUILT_IN_ROLE_IDS.hrAdmin, BUILT_IN_ROLE_IDS.manager, BUILT_IN_ROLE_IDS.employee];

function defaultConfigFor(item: BuiltInNavItem, index: number): SidebarItemConfig {
  return {
    id: item.id,
    kind: "built_in",
    label: item.label,
    basePath: item.basePath,
    sectionKey: item.sectionKey,
    displayOrder: index,
    allowedRoleIds: [...ALL_BUILT_IN_ROLES],
    isHidden: false,
  };
}

/**
 * Merges stored overrides over the built-in defaults. Any built-in item that has
 * never been edited returns its default config, so the untouched app behaves
 * exactly as it did before Phase 12.
 */
export function getSidebarConfigSync(): SidebarItemConfig[] {
  const stored = read();
  const byId = new Map(stored.map((c) => [c.id, c]));
  const builtIns = BUILT_IN_NAV_ITEMS.map((item, i) => {
    const override = byId.get(item.id);
    const base = defaultConfigFor(item, i);
    return override ? { ...base, ...override, kind: "built_in" as const, sectionKey: base.sectionKey, basePath: base.basePath } : base;
  });
  const customs = stored.filter((c) => c.kind !== "built_in");
  return [...builtIns, ...customs];
}

export const navigationApi = {
  async list(): Promise<ApiResponse<SidebarItemConfig[]>> {
    return delay(ok(getSidebarConfigSync()));
  },

  async updateItem(id: string, patch: Partial<SidebarItemConfig>): Promise<ApiResponse<SidebarItemConfig>> {
    const all = getSidebarConfigSync();
    const current = all.find((c) => c.id === id);
    if (!current) return delay(fail("Navigation item not found."));
    const next: SidebarItemConfig = {
      ...current,
      ...patch,
      id: current.id,
      kind: current.kind,
      // sectionKey is immutable — reordering is scoped within a section (Edge case 6).
      sectionKey: current.sectionKey,
      basePath: current.basePath,
    };
    const stored = read().filter((c) => c.id !== id);
    write([...stored, next]);
    return delay(ok(next));
  },

  /** Reorder within one section only. `orderedIds` must all share that section. */
  async reorder(sectionKey: SidebarSectionKey, orderedIds: string[]): Promise<ApiResponse<true>> {
    const all = getSidebarConfigSync();
    const stored = read();
    const map = new Map(stored.map((c) => [c.id, c]));
    orderedIds.forEach((id, i) => {
      const current = all.find((c) => c.id === id);
      if (!current || current.sectionKey !== sectionKey) return;
      map.set(id, { ...current, displayOrder: i });
    });
    write([...map.values()]);
    return delay(ok(true as const));
  },

  async createCustomItem(input: { label: string; icon: string; allowedRoleIds: string[] }): Promise<ApiResponse<SidebarItemConfig>> {
    if (!input.label.trim()) return delay(fail("Label is required."));
    const stored = read();
    const customCount = stored.filter((c) => c.kind === "custom_top_level").length;
    const created: SidebarItemConfig = {
      id: uid("nav_"),
      kind: "custom_top_level",
      label: input.label.trim(),
      icon: input.icon,
      sectionKey: "custom",
      displayOrder: customCount,
      allowedRoleIds: input.allowedRoleIds,
      isHidden: false,
    };
    write([...stored, created]);
    return delay(ok(created));
  },

  /** Upserts the custom_form_link child that represents a published form. */
  async upsertFormLink(input: {
    formId: string;
    label: string;
    parentId: string;
    allowedRoleIds: string[];
  }): Promise<ApiResponse<SidebarItemConfig>> {
    const stored = read();
    const existing = stored.find((c) => c.kind === "custom_form_link" && c.linkedFormId === input.formId);
    const next: SidebarItemConfig = {
      id: existing?.id ?? uid("navform_"),
      kind: "custom_form_link",
      label: input.label,
      parentId: input.parentId,
      linkedFormId: input.formId,
      sectionKey: "custom",
      displayOrder: existing?.displayOrder ?? stored.filter((c) => c.parentId === input.parentId).length,
      allowedRoleIds: input.allowedRoleIds,
      isHidden: false,
    };
    write([...stored.filter((c) => c.id !== next.id), next]);
    return delay(ok(next));
  },

  async removeFormLink(formId: string): Promise<ApiResponse<true>> {
    write(read().filter((c) => !(c.kind === "custom_form_link" && c.linkedFormId === formId)));
    return delay(ok(true as const));
  },

  /** Edge case 2 — blocked while forms are still attached. */
  async deleteCustomItem(id: string): Promise<ApiResponse<true>> {
    const stored = read();
    const children = stored.filter((c) => c.parentId === id);
    if (children.length > 0) {
      return delay(
        fail(`This navigation item has ${children.length} form${children.length === 1 ? "" : "s"} attached. Move or delete them first.`),
      );
    }
    write(stored.filter((c) => c.id !== id));
    return delay(ok(true as const));
  },
};