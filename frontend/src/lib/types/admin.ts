/** Super admin / platform data shapes. */
import type { Tenant } from "./tenant";

export type TenantStatus = "active" | "trial" | "suspended" | "churned";
export type TenantPlan = "Trial" | "Starter" | "Growth" | "Enterprise";

export interface TenantSummary {
  id: string;
  companyName: string;
  industry: string;
  employees: number;
  plan: TenantPlan;
  status: TenantStatus;
  joinedAt: string;
  isTest?: boolean;
  trialEndsAt?: string;
  internalNotes?: string;
  // Embedded tenant settings (for detail view)
  tenant?: Tenant;
}

export interface PlatformMetrics {
  totalTenants: number;
  totalTenantsTrend: string;
  totalEmployees: number;
  totalEmployeesTrend: string;
  newTenantsThisMonth: number;
  newTenantsTrend: string;
  tenantsInTrial: number;
  tenantsInTrialTrend: string;
}

export interface TenantActivityEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
}

export interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  defaultTrialDays: number;
  defaultPlan: TenantPlan;
}
