/** Seeds a demo tenant + role-based demo credentials into localStorage for quick login. */
import type { Tenant } from "../types/tenant";
import type { Role, User } from "../types/user";
import { DEFAULT_THEME } from "../themes/defaults";

export const DEMO_PASSWORD = "demo1234";
export const DEMO_EMAIL = "admin@acme.demo";

const TENANTS_KEY = "hrms.tenants";
const CRED_KEY = "hrms.credentials";
const TENANT_ID = "tn_demo";

export interface DemoAccount {
  key: "hr" | "manager" | "employee";
  label: string;
  blurb: string;
  email: string;
  password: string;
  user: User;
}

function mkUser(id: string, fullName: string, email: string, role: Role): User {
  return { id, tenantId: TENANT_ID, fullName, email, role };
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    key: "hr",
    label: "HR Admin",
    blurb: "Full access — people, payroll, settings",
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    user: mkUser("u_demo", "Jordan Reyes", DEMO_EMAIL, "hr_admin"),
  },
  {
    key: "manager",
    label: "Manager",
    blurb: "Team view — approvals and performance",
    email: "riley.chen@acme.demo",
    password: DEMO_PASSWORD,
    user: mkUser("u_demo_mgr", "Riley Chen", "riley.chen@acme.demo", "manager"),
  },
  {
    key: "employee",
    label: "Employee",
    blurb: "Self-service — attendance, leave, payslips",
    email: "aisha.khan@acme.demo",
    password: DEMO_PASSWORD,
    user: mkUser("u_demo_emp", "Aisha Khan", "aisha.khan@acme.demo", "employee"),
  },
];

const DEMO_TENANT: Tenant = {
  id: TENANT_ID,
  createdAt: new Date().toISOString(),
  theme: {
    ...DEFAULT_THEME,
    primaryColor: "#1E40AF",
    accentColor: "#F97316",
    textOnPrimary: "#FFFFFF",
  },
  settings: {
    companyName: "Acme Inc.",
    domain: "https://acme.demo",
    industry: "Software & Technology",
    size: "201-500",
    country: "United States",
    hrContactName: "Jordan Reyes",
    hrContactEmail: DEMO_EMAIL,
  },
};

export function seedDemoData() {
  if (typeof window === "undefined") return;
  try {
    const tenants = JSON.parse(window.localStorage.getItem(TENANTS_KEY) ?? "[]") as Tenant[];
    if (!tenants.some((t) => t.id === TENANT_ID)) {
      window.localStorage.setItem(TENANTS_KEY, JSON.stringify([...tenants, DEMO_TENANT]));
    }

    const creds = JSON.parse(window.localStorage.getItem(CRED_KEY) ?? "[]") as Array<{
      email: string;
      password: string;
      user: User;
    }>;
    const missing = DEMO_ACCOUNTS.filter((a) => !creds.some((c) => c.email === a.email)).map((a) => ({
      email: a.email,
      password: a.password,
      user: a.user,
    }));
    if (missing.length) {
      window.localStorage.setItem(CRED_KEY, JSON.stringify([...creds, ...missing]));
    }
  } catch {
    // ignore corrupted storage
  }
}
