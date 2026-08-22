/** RBAC API: roles, assignments, delegations, audit log — localStorage backed. */
import type { ApiResponse } from "../types/api";
import type {
  Delegation,
  PermissionAuditEntry,
  PermissionEntry,
  Role,
  UserRoleAssignment,
  AuditAction,
} from "../types/rbac";
import { BUILT_IN_ROLE_IDS } from "../types/rbac";
import { PERMISSIONS, type PermissionKey } from "../types/permissions";
import { delay, ok, uid } from "./client";

const ROLES_KEY = "hrms.roles";
const ASSIGN_KEY = "hrms.roleAssignments";
const DELEG_KEY = "hrms.delegations";
const AUDIT_KEY = "hrms.permissionAudit";
const SEEDED = "hrms.rbac.seeded";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(val));
}

const allKeys = Object.keys(PERMISSIONS) as PermissionKey[];

function buildHRAdmin(): Role {
  return {
    id: BUILT_IN_ROLE_IDS.hrAdmin,
    name: "HR Admin",
    description: "Full access to every module and every employee.",
    type: "built_in",
    permissions: allKeys.map((key) => ({ key, scope: "all" })),
    employeeCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
function buildManager(): Role {
  const perms: PermissionEntry[] = [
    { key: "dashboard.view" },
    { key: "employees.view_list", scope: "team" },
    { key: "employees.view_profile", scope: "team" },
    { key: "org_chart.view" },
    { key: "leave.view_own" },
    { key: "leave.view_team", scope: "team" },
    { key: "leave.apply" },
    { key: "leave.approve", scope: "team" },
    { key: "attendance.view_own" },
    { key: "attendance.view_team", scope: "team" },
    { key: "performance.view_own" },
    { key: "performance.view_team", scope: "team" },
    { key: "reports.view" },
    { key: "settings.company.view" },
    { key: "ai.chat" },
  ];
  return {
    id: BUILT_IN_ROLE_IDS.manager,
    name: "Manager",
    description: "Manage your team — approvals, performance, visibility.",
    type: "built_in",
    permissions: perms,
    employeeCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
function buildEmployee(): Role {
  const perms: PermissionEntry[] = [
    { key: "dashboard.view" },
    { key: "employees.view_list", scope: "all" },
    { key: "org_chart.view" },
    { key: "leave.view_own" },
    { key: "leave.apply" },
    { key: "attendance.view_own" },
    { key: "performance.view_own" },
    { key: "payroll.view_own" },
    { key: "ai.chat" },
  ];
  return {
    id: BUILT_IN_ROLE_IDS.employee,
    name: "Employee",
    description: "Self-service access to own data and the directory.",
    type: "built_in",
    permissions: perms,
    employeeCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function seedBuiltInRoles() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(SEEDED) === "1") return;
  write(ROLES_KEY, [buildHRAdmin(), buildManager(), buildEmployee()]);
  write(ASSIGN_KEY, []);
  write(DELEG_KEY, []);
  write(AUDIT_KEY, []);
  window.localStorage.setItem(SEEDED, "1");
}

function recountRoles(roles: Role[], assignments: UserRoleAssignment[]): Role[] {
  return roles.map((r) => ({
    ...r,
    employeeCount: assignments.filter((a) => a.roleId === r.id).length,
  }));
}

function getActorName(): string {
  try {
    const raw = window.localStorage.getItem("hrms.auth");
    if (raw) {
      const u = JSON.parse(raw) as { user?: { fullName?: string; id?: string } };
      return u.user?.fullName ?? "System";
    }
  } catch {}
  return "System";
}
function getActorId(): string {
  try {
    const raw = window.localStorage.getItem("hrms.auth");
    if (raw) {
      const u = JSON.parse(raw) as { user?: { id?: string } };
      return u.user?.id ?? "system";
    }
  } catch {}
  return "system";
}

function log(action: AuditAction, details: string, targetId?: string, targetName?: string) {
  const entry: PermissionAuditEntry = {
    id: uid("aud_"),
    action,
    actorId: getActorId(),
    actorName: getActorName(),
    targetId,
    targetName,
    details,
    timestamp: new Date().toISOString(),
  };
  const list = read<PermissionAuditEntry[]>(AUDIT_KEY, []);
  write(AUDIT_KEY, [entry, ...list].slice(0, 500));
}

/* ---------------- Roles ---------------- */

export async function listRoles(): Promise<ApiResponse<Role[]>> {
  seedBuiltInRoles();
  const roles = read<Role[]>(ROLES_KEY, []);
  const assignments = read<UserRoleAssignment[]>(ASSIGN_KEY, []);
  return delay(ok(recountRoles(roles, assignments)));
}

export async function getRole(id: string): Promise<ApiResponse<Role | null>> {
  seedBuiltInRoles();
  const roles = read<Role[]>(ROLES_KEY, []);
  const assignments = read<UserRoleAssignment[]>(ASSIGN_KEY, []);
  const r = recountRoles(roles, assignments).find((x) => x.id === id) ?? null;
  return delay(ok(r));
}

export async function createRole(input: {
  name: string;
  description?: string;
  permissions: PermissionEntry[];
  baseRoleId?: string;
}): Promise<ApiResponse<Role>> {
  seedBuiltInRoles();
  const roles = read<Role[]>(ROLES_KEY, []);
  const role: Role = {
    id: uid("role_"),
    name: input.name.trim(),
    description: input.description?.trim(),
    type: "custom",
    permissions: input.permissions,
    employeeCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: getActorId(),
  };
  write(ROLES_KEY, [...roles, role]);
  log("role_created", `Created custom role "${role.name}"`, role.id, role.name);
  return delay(ok(role));
}

export async function updateRole(
  id: string,
  patch: Partial<Pick<Role, "name" | "description" | "permissions">>,
): Promise<ApiResponse<Role | null>> {
  const roles = read<Role[]>(ROLES_KEY, []);
  const idx = roles.findIndex((r) => r.id === id);
  if (idx < 0) return delay(ok(null));
  const current = roles[idx];
  if (current.type === "built_in") return delay(ok(current));
  const next: Role = { ...current, ...patch, updatedAt: new Date().toISOString() };
  roles[idx] = next;
  write(ROLES_KEY, roles);
  log("role_updated", `Updated role "${next.name}"`, next.id, next.name);
  return delay(ok(next));
}

export async function deleteRole(id: string): Promise<ApiResponse<{ id: string } | null>> {
  const roles = read<Role[]>(ROLES_KEY, []);
  const target = roles.find((r) => r.id === id);
  if (!target || target.type === "built_in") return delay(ok(null));
  // Reassign affected employees to Employee built-in role.
  const assignments = read<UserRoleAssignment[]>(ASSIGN_KEY, []);
  const updated = assignments.map((a) =>
    a.roleId === id ? { ...a, roleId: BUILT_IN_ROLE_IDS.employee, assignedAt: new Date().toISOString() } : a,
  );
  write(ASSIGN_KEY, updated);
  write(
    ROLES_KEY,
    roles.filter((r) => r.id !== id),
  );
  log("role_deleted", `Deleted custom role "${target.name}"`, target.id, target.name);
  return delay(ok({ id }));
}

/* ---------------- Assignments ---------------- */

export async function listAssignments(): Promise<ApiResponse<UserRoleAssignment[]>> {
  seedBuiltInRoles();
  return delay(ok(read<UserRoleAssignment[]>(ASSIGN_KEY, [])));
}

export async function getAssignment(employeeId: string): Promise<ApiResponse<UserRoleAssignment | null>> {
  seedBuiltInRoles();
  const list = read<UserRoleAssignment[]>(ASSIGN_KEY, []);
  return delay(ok(list.find((a) => a.employeeId === employeeId) ?? null));
}

export async function assignRole(
  employeeId: string,
  roleId: string,
  employeeName?: string,
  roleName?: string,
): Promise<ApiResponse<UserRoleAssignment>> {
  seedBuiltInRoles();
  const list = read<UserRoleAssignment[]>(ASSIGN_KEY, []);
  const without = list.filter((a) => a.employeeId !== employeeId);
  const entry: UserRoleAssignment = {
    employeeId,
    roleId,
    assignedAt: new Date().toISOString(),
    assignedBy: getActorId(),
  };
  write(ASSIGN_KEY, [...without, entry]);
  log(
    "role_assigned",
    `Assigned "${roleName ?? roleId}" role to ${employeeName ?? employeeId}`,
    employeeId,
    employeeName,
  );
  return delay(ok(entry));
}

export async function bulkAssignRole(
  employeeIds: string[],
  roleId: string,
  roleName?: string,
): Promise<ApiResponse<{ count: number }>> {
  for (const id of employeeIds) {
    await assignRole(id, roleId, id, roleName);
  }
  return ok({ count: employeeIds.length });
}

/* ---------------- Delegations ---------------- */

function reconcileDelegations(list: Delegation[]): Delegation[] {
  const now = Date.now();
  return list.map((d) => {
    if (d.status === "revoked") return d;
    return new Date(d.endDate).getTime() < now ? { ...d, status: "expired" } : d;
  });
}

export async function listDelegations(): Promise<ApiResponse<Delegation[]>> {
  const list = reconcileDelegations(read<Delegation[]>(DELEG_KEY, []));
  write(DELEG_KEY, list);
  return delay(ok(list));
}

export async function createDelegation(input: Omit<Delegation, "id" | "status" | "createdAt" | "createdBy">): Promise<ApiResponse<Delegation>> {
  const list = read<Delegation[]>(DELEG_KEY, []);
  const d: Delegation = {
    ...input,
    id: uid("dlg_"),
    status: "active",
    createdAt: new Date().toISOString(),
    createdBy: getActorId(),
  };
  write(DELEG_KEY, [d, ...list]);
  log(
    "delegation_created",
    `Delegated ${d.roleId ? "role" : `${d.permissions?.length ?? 0} permissions`} to ${d.toEmployeeId} until ${d.endDate.slice(0, 10)}`,
    d.toEmployeeId,
  );
  return delay(ok(d));
}

export async function revokeDelegation(id: string): Promise<ApiResponse<Delegation | null>> {
  const list = read<Delegation[]>(DELEG_KEY, []);
  const idx = list.findIndex((d) => d.id === id);
  if (idx < 0) return delay(ok(null));
  list[idx] = { ...list[idx], status: "revoked", revokedAt: new Date().toISOString(), revokedBy: getActorId() };
  write(DELEG_KEY, list);
  log("delegation_revoked", `Revoked delegation ${id}`, list[idx].toEmployeeId);
  return delay(ok(list[idx]));
}

/* ---------------- Audit ---------------- */

export async function listAuditLog(): Promise<ApiResponse<PermissionAuditEntry[]>> {
  return delay(ok(read<PermissionAuditEntry[]>(AUDIT_KEY, [])));
}

/* ---------------- Effective permissions ---------------- */

export interface EffectivePermissions {
  roleId: string | null;
  role: Role | null;
  permissions: PermissionEntry[]; // role + active delegations merged
}

export function getEffectivePermissionsSync(employeeId: string, userRoleOverride?: string): EffectivePermissions {
  if (typeof window === "undefined") return { roleId: null, role: null, permissions: [] };
  seedBuiltInRoles();
  const roles = read<Role[]>(ROLES_KEY, []);
  const assignments = read<UserRoleAssignment[]>(ASSIGN_KEY, []);
  const delegations = reconcileDelegations(read<Delegation[]>(DELEG_KEY, []));

  // Find assignment, fall back to override (e.g. seeded demo user with role "hr_admin")
  const assignment = assignments.find((a) => a.employeeId === employeeId);
  let roleId = assignment?.roleId ?? null;
  if (!roleId && userRoleOverride) {
    const map: Record<string, string> = {
      hr_admin: BUILT_IN_ROLE_IDS.hrAdmin,
      manager: BUILT_IN_ROLE_IDS.manager,
      employee: BUILT_IN_ROLE_IDS.employee,
      super_admin: BUILT_IN_ROLE_IDS.hrAdmin,
    };
    roleId = map[userRoleOverride] ?? BUILT_IN_ROLE_IDS.employee;
  }
  const role = roleId ? roles.find((r) => r.id === roleId) ?? null : null;
  const perms: PermissionEntry[] = role ? [...role.permissions] : [];

  const now = Date.now();
  const myDelegations = delegations.filter(
    (d) =>
      d.toEmployeeId === employeeId &&
      d.status === "active" &&
      new Date(d.startDate).getTime() <= now &&
      new Date(d.endDate).getTime() >= now,
  );
  for (const d of myDelegations) {
    if (d.roleId) {
      const r = roles.find((rr) => rr.id === d.roleId);
      if (r) perms.push(...r.permissions);
    }
    if (d.permissions) perms.push(...d.permissions);
  }

  // Dedupe by key (preserve broadest scope: all > department > team > self)
  const order: Record<string, number> = { all: 4, department: 3, team: 2, self: 1 };
  const byKey = new Map<string, PermissionEntry>();
  for (const p of perms) {
    const existing = byKey.get(p.key);
    if (!existing) byKey.set(p.key, p);
    else {
      const a = p.scope ? order[p.scope] : 0;
      const b = existing.scope ? order[existing.scope] : 0;
      if (a > b) byKey.set(p.key, p);
    }
  }
  return { roleId, role, permissions: Array.from(byKey.values()) };
}