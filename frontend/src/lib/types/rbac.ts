/** RBAC domain types — roles, assignments, delegations, audit. */
import type { PermissionKey } from "./permissions";

export type PermissionScope = "all" | "department" | "team" | "self";
export type RoleType = "built_in" | "custom";

export interface PermissionEntry {
  key: PermissionKey;
  scope?: PermissionScope;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  type: RoleType;
  permissions: PermissionEntry[];
  employeeCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface UserRoleAssignment {
  employeeId: string;
  roleId: string;
  assignedAt: string;
  assignedBy: string;
}

export type DelegationStatus = "active" | "expired" | "revoked";

export interface Delegation {
  id: string;
  fromEmployeeId: string;
  toEmployeeId: string;
  roleId?: string;
  permissions?: PermissionEntry[];
  startDate: string;
  endDate: string;
  reason?: string;
  status: DelegationStatus;
  createdAt: string;
  createdBy: string;
  revokedAt?: string;
  revokedBy?: string;
}

export type AuditAction =
  | "role_created"
  | "role_updated"
  | "role_deleted"
  | "role_assigned"
  | "role_unassigned"
  | "delegation_created"
  | "delegation_revoked";

export interface PermissionAuditEntry {
  id: string;
  action: AuditAction;
  actorId: string;
  actorName: string;
  targetId?: string;
  targetName?: string;
  details: string;
  timestamp: string;
}

export const BUILT_IN_ROLE_IDS = {
  hrAdmin: "role_hr_admin",
  manager: "role_manager",
  employee: "role_employee",
} as const;