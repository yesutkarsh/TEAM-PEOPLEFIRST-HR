/** Tenant CRUD — mocked via localStorage. */
import type { ApiResponse } from "../types/api";
import type { Tenant, TenantSettings } from "../types/tenant";
import type { TenantTheme } from "../themes/types";
import { delay, fail, ok, uid } from "./client";

const KEY = "hrms.tenants";

function readAll(): Tenant[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as Tenant[];
  } catch {
    return [];
  }
}

function writeAll(list: Tenant[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

export const tenantsApi = {
  async create(input: { settings: TenantSettings; theme: TenantTheme }): Promise<ApiResponse<Tenant>> {
    const list = readAll();
    if (list.some((t) => t.settings.hrContactEmail === input.settings.hrContactEmail)) {
      return delay(fail<Tenant>("A workspace with this email already exists."));
    }
    const tenant: Tenant = {
      id: uid("tn_"),
      settings: input.settings,
      theme: input.theme,
      createdAt: new Date().toISOString(),
    };
    writeAll([...list, tenant]);
    return delay(ok(tenant));
  },

  async updateTheme(tenantId: string, theme: TenantTheme): Promise<ApiResponse<Tenant>> {
    const list = readAll();
    const idx = list.findIndex((t) => t.id === tenantId);
    if (idx === -1) return delay(fail<Tenant>("Workspace not found."));
    list[idx] = { ...list[idx], theme };
    writeAll(list);
    return delay(ok(list[idx]));
  },

  async findByEmail(email: string): Promise<ApiResponse<Tenant>> {
    const t = readAll().find((x) => x.settings.hrContactEmail === email);
    return delay(t ? ok(t) : fail<Tenant>("Workspace not found."));
  },
};