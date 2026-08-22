/** Auth — mocked. Credentials live alongside tenants in localStorage. */
import type { ApiResponse } from "../types/api";
import type { User } from "../types/user";
import type { Tenant } from "../types/tenant";
import { delay, fail, ok, uid } from "./client";
import { tenantsApi } from "./tenants";

const CRED_KEY = "hrms.credentials";

interface Credential {
  email: string;
  password: string;
  user: User;
}

function readCreds(): Credential[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(CRED_KEY) ?? "[]") as Credential[];
  } catch {
    return [];
  }
}

function writeCreds(list: Credential[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CRED_KEY, JSON.stringify(list));
}

export const authApi = {
  async register(input: {
    fullName: string;
    email: string;
    password: string;
    tenantId: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> {
    const creds = readCreds();
    if (creds.some((c) => c.email === input.email)) {
      return delay(fail("An account with this email already exists."));
    }
    const user: User = {
      id: uid("u_"),
      tenantId: input.tenantId,
      fullName: input.fullName,
      email: input.email,
      role: "hr_admin",
    };
    writeCreds([...creds, { email: input.email, password: input.password, user }]);
    return delay(ok({ user, token: uid("tok_") }));
  },

  async login(
    email: string,
    password: string,
  ): Promise<ApiResponse<{ user: User; token: string; tenant: Tenant }>> {
    const cred = readCreds().find((c) => c.email === email);
    if (!cred || cred.password !== password) {
      return delay(fail("Incorrect email or password."));
    }
    const tenantRes = await tenantsApi.findByEmail(cred.user.email).catch(() => null);
    // Look up by tenant id when contact email differs from user email
    const allTenants: Tenant[] = (() => {
      try {
        return JSON.parse(window.localStorage.getItem("hrms.tenants") ?? "[]") as Tenant[];
      } catch {
        return [];
      }
    })();
    const tenant = tenantRes?.data ?? allTenants.find((t) => t.id === cred.user.tenantId);
    if (!tenant) return delay(fail("Workspace not found."));
    return delay(ok({ user: cred.user, token: uid("tok_"), tenant }));
  },

  async logout(): Promise<ApiResponse<true>> {
    return delay(ok(true as const));
  },
};