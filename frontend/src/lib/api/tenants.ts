/** Tenant CRUD — Connected to Next.js API. */
import type { ApiResponse } from "../types/api";
import type { Tenant, TenantSettings } from "../types/tenant";
import type { TenantTheme } from "../themes/types";
import { request } from "./client";

export const tenantsApi = {
  async create(input: { settings: TenantSettings; theme: TenantTheme }): Promise<ApiResponse<Tenant>> {
    const res = await request<Tenant>("/api/tenants", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (res.data) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("hrms.tenant", JSON.stringify(res.data));
      }
    }
    return res;
  },

  async updateTheme(tenantId: string, theme: TenantTheme): Promise<ApiResponse<Tenant>> {
    const res = await request<Tenant>("/api/tenants/settings", {
      method: "PUT",
      body: JSON.stringify({ tenantId, theme }),
    });
    if (res.data) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("hrms.tenant", JSON.stringify(res.data));
      }
    }
    return res;
  },

  async findByEmail(email: string): Promise<ApiResponse<Tenant>> {
    return request<Tenant>(`/api/tenants?email=${encodeURIComponent(email)}`);
  },
};