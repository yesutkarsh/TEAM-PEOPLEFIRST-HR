/** Auth — HTTP Client connected to Next.js API. */
import type { ApiResponse } from "../types/api";
import type { User } from "../types/user";
import type { Tenant } from "../types/tenant";
import { request, ok } from "./client";

export const authApi = {
  async register(input: {
    fullName: string;
    email: string;
    password: string;
    tenantId: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> {
    const res = await request<{ user: User; token: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });

    if (res.data) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("hrms.token", res.data.token);
        window.localStorage.setItem("hrms.user", JSON.stringify(res.data.user));
      }
    }
    return res;
  },

  async login(
    email: string,
    password: string,
  ): Promise<ApiResponse<{ user: User; token: string; tenant: Tenant }>> {
    const res = await request<{ user: User; token: string; tenant: Tenant }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (res.data) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("hrms.token", res.data.token);
        window.localStorage.setItem("hrms.user", JSON.stringify(res.data.user));
        window.localStorage.setItem("hrms.tenant", JSON.stringify(res.data.tenant));
      }
    }
    return res;
  },

  async logout(): Promise<ApiResponse<true>> {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("hrms.token");
      window.localStorage.removeItem("hrms.user");
      window.localStorage.removeItem("hrms.tenant");
    }
    return ok(true as const);
  },
};