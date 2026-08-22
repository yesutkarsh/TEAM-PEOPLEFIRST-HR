/** Super admin mock API — manages platform tenants. */
import type { ApiResponse } from "../types/api";
import type { Tenant } from "../types/tenant";
import type {
  PlatformMetrics,
  PlatformSettings,
  TenantActivityEntry,
  TenantStatus,
  TenantSummary,
} from "../types/admin";
import { delay, fail, ok, uid } from "./client";
import { DEFAULT_THEME } from "../themes/defaults";

const TENANTS_KEY = "hrms.tenants";
const SUMMARIES_KEY = "hrms.admin.tenants";
const ACTIVITY_KEY = "hrms.admin.activity";
const SETTINGS_KEY = "hrms.admin.settings";

const SUPER_ADMIN_EMAIL = "admin@hrms.platform";
const SUPER_ADMIN_PASSWORD = "platform2026";

function readAllTenants(): Tenant[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(TENANTS_KEY) ?? "[]"); } catch { return []; }
}
function readSummaries(): TenantSummary[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(SUMMARIES_KEY) ?? "[]"); } catch { return []; }
}
function writeSummaries(list: TenantSummary[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SUMMARIES_KEY, JSON.stringify(list));
}
function readActivity(): Record<string, TenantActivityEntry[]> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(ACTIVITY_KEY) ?? "{}"); } catch { return {}; }
}
function writeActivity(map: Record<string, TenantActivityEntry[]>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVITY_KEY, JSON.stringify(map));
}
function logActivity(tenantId: string, action: string, actor = "Platform Admin") {
  const map = readActivity();
  const list = map[tenantId] ?? [];
  list.unshift({ id: uid("act_"), timestamp: new Date().toISOString(), action, actor });
  map[tenantId] = list.slice(0, 50);
  writeActivity(map);
}

/** Seeds demo tenants the first time the super admin loads the portal. */
export function seedAdminDemoData() {
  if (typeof window === "undefined") return;
  const existing = readSummaries();
  if (existing.length > 0) return;

  const now = Date.now();
  const day = 86_400_000;
  const samples: TenantSummary[] = [
    { id: "tn_demo", companyName: "Acme Inc.", industry: "Software & Technology", employees: 298, plan: "Growth", status: "active", joinedAt: new Date(now - 120 * day).toISOString() },
    { id: "tn_pixel", companyName: "Pixel Foundry", industry: "Media & Entertainment", employees: 42, plan: "Starter", status: "active", joinedAt: new Date(now - 60 * day).toISOString() },
    { id: "tn_north", companyName: "NorthBank", industry: "Financial Services", employees: 1820, plan: "Enterprise", status: "active", joinedAt: new Date(now - 240 * day).toISOString() },
    { id: "tn_heal", companyName: "HealCo Medical", industry: "Healthcare", employees: 540, plan: "Growth", status: "trial", joinedAt: new Date(now - 12 * day).toISOString(), trialEndsAt: new Date(now + 18 * day).toISOString() },
    { id: "tn_bytes", companyName: "Byte Labs", industry: "Software & Technology", employees: 18, plan: "Trial", status: "trial", joinedAt: new Date(now - 4 * day).toISOString(), trialEndsAt: new Date(now + 26 * day).toISOString(), isTest: true },
    { id: "tn_ret", companyName: "Retail Mosaic", industry: "Retail & E-commerce", employees: 96, plan: "Starter", status: "suspended", joinedAt: new Date(now - 400 * day).toISOString() },
    { id: "tn_grain", companyName: "Grainline Co.", industry: "Manufacturing", employees: 320, plan: "Growth", status: "churned", joinedAt: new Date(now - 720 * day).toISOString() },
  ];
  writeSummaries(samples);

  // Seed activity for the first tenant
  logActivity("tn_demo", "Tenant created", "System");
  logActivity("tn_demo", "Onboarding completed", "Jordan Reyes");
  logActivity("tn_heal", "Tenant created", "System");
  logActivity("tn_heal", "Trial started", "System");
}

function statusBucket(): PlatformMetrics {
  const list = readSummaries();
  const day = 86_400_000;
  const cutoff = Date.now() - 30 * day;
  const newCount = list.filter((t) => new Date(t.joinedAt).getTime() > cutoff).length;
  const trial = list.filter((t) => t.status === "trial").length;
  const active = list.filter((t) => t.status === "active").length;
  const employees = list.reduce((sum, t) => sum + t.employees, 0);
  return {
    totalTenants: active,
    totalTenantsTrend: `+${newCount} this month`,
    totalEmployees: employees,
    totalEmployeesTrend: "+128 this month",
    newTenantsThisMonth: newCount,
    newTenantsTrend: `${newCount >= 3 ? "+" : ""}${newCount - 2} vs last month`,
    tenantsInTrial: trial,
    tenantsInTrialTrend: `${trial} converting soon`,
  };
}

export const adminApi = {
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; name: string }>> {
    if (email === SUPER_ADMIN_EMAIL && password === SUPER_ADMIN_PASSWORD) {
      return delay(ok({ token: uid("sa_"), name: "Platform Admin" }));
    }
    return delay(fail("Invalid platform credentials."));
  },

  async getPlatformMetrics(): Promise<ApiResponse<PlatformMetrics>> {
    return delay(ok(statusBucket()));
  },

  async listTenants(): Promise<ApiResponse<TenantSummary[]>> {
    const summaries = readSummaries();
    const tenants = readAllTenants();
    const enriched = summaries.map((s) => ({ ...s, tenant: tenants.find((t) => t.id === s.id) }));
    return delay(ok(enriched));
  },

  async getTenant(id: string): Promise<ApiResponse<TenantSummary>> {
    const s = readSummaries().find((x) => x.id === id);
    if (!s) return delay(fail("Tenant not found."));
    const t = readAllTenants().find((x) => x.id === id);
    return delay(ok({ ...s, tenant: t }));
  },

  async getActivity(tenantId: string): Promise<ApiResponse<TenantActivityEntry[]>> {
    return delay(ok(readActivity()[tenantId] ?? []));
  },

  async setStatus(tenantId: string, status: TenantStatus): Promise<ApiResponse<TenantSummary>> {
    const list = readSummaries();
    const idx = list.findIndex((t) => t.id === tenantId);
    if (idx === -1) return delay(fail("Tenant not found."));
    list[idx] = { ...list[idx], status };
    writeSummaries(list);
    logActivity(tenantId, `Status set to ${status}`);
    return delay(ok(list[idx]));
  },

  async deleteTenant(tenantId: string): Promise<ApiResponse<true>> {
    const list = readSummaries().filter((t) => t.id !== tenantId);
    writeSummaries(list);
    const map = readActivity();
    delete map[tenantId];
    writeActivity(map);
    return delay(ok(true as const));
  },

  async clearTestTenants(): Promise<ApiResponse<number>> {
    const list = readSummaries();
    const kept = list.filter((t) => !t.isTest);
    writeSummaries(kept);
    return delay(ok(list.length - kept.length));
  },

  async createTenantManual(input: {
    companyName: string;
    domain: string;
    industry: string;
    size: string;
    country: string;
    hrContactName: string;
    hrContactEmail: string;
    plan: TenantSummary["plan"];
    trialEndsAt?: string;
    internalNotes?: string;
  }): Promise<ApiResponse<TenantSummary>> {
    const id = uid("tn_");
    const summary: TenantSummary = {
      id,
      companyName: input.companyName,
      industry: input.industry,
      employees: 0,
      plan: input.plan,
      status: input.plan === "Trial" ? "trial" : "active",
      joinedAt: new Date().toISOString(),
      trialEndsAt: input.trialEndsAt,
      internalNotes: input.internalNotes,
    };
    const list = readSummaries();
    writeSummaries([summary, ...list]);
    // Also persist as a Tenant so onboarding/login can find it
    const tenants = readAllTenants();
    tenants.push({
      id,
      createdAt: summary.joinedAt,
      theme: DEFAULT_THEME,
      settings: {
        companyName: input.companyName,
        domain: input.domain,
        industry: input.industry,
        size: input.size as never,
        country: input.country,
        hrContactName: input.hrContactName,
        hrContactEmail: input.hrContactEmail,
      },
    });
    window.localStorage.setItem(TENANTS_KEY, JSON.stringify(tenants));
    logActivity(id, "Tenant created manually");
    return delay(ok(summary));
  },

  async updateTenantBasics(tenantId: string, patch: { companyName?: string; domain?: string }): Promise<ApiResponse<TenantSummary>> {
    const list = readSummaries();
    const idx = list.findIndex((t) => t.id === tenantId);
    if (idx === -1) return delay(fail("Tenant not found."));
    if (patch.companyName) list[idx] = { ...list[idx], companyName: patch.companyName };
    writeSummaries(list);
    const tenants = readAllTenants();
    const tIdx = tenants.findIndex((t) => t.id === tenantId);
    if (tIdx !== -1) {
      tenants[tIdx] = {
        ...tenants[tIdx],
        settings: {
          ...tenants[tIdx].settings,
          companyName: patch.companyName ?? tenants[tIdx].settings.companyName,
          domain: patch.domain ?? tenants[tIdx].settings.domain,
        },
      };
      window.localStorage.setItem(TENANTS_KEY, JSON.stringify(tenants));
    }
    logActivity(tenantId, "Tenant details updated");
    return delay(ok(list[idx]));
  },

  async getSettings(): Promise<ApiResponse<PlatformSettings>> {
    if (typeof window === "undefined") return delay(ok({ platformName: "HRMS Platform", supportEmail: "support@hrms.app", defaultTrialDays: 30, defaultPlan: "Trial" }));
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (raw) return delay(ok(JSON.parse(raw) as PlatformSettings));
    } catch {}
    return delay(ok({ platformName: "HRMS Platform", supportEmail: "support@hrms.app", defaultTrialDays: 30, defaultPlan: "Trial" }));
  },

  async saveSettings(s: PlatformSettings): Promise<ApiResponse<PlatformSettings>> {
    if (typeof window !== "undefined") window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    return delay(ok(s));
  },
};

export const SUPER_ADMIN_CREDS = { email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASSWORD };
