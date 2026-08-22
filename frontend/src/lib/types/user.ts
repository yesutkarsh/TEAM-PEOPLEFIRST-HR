export type Role = "super_admin" | "hr_admin" | "manager" | "employee";

export interface User {
  id: string;
  tenantId: string;
  fullName: string;
  email: string;
  role: Role;
}

export type Permission = string;