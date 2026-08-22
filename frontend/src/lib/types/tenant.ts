import type { TenantTheme } from "../themes/types";

export type CompanySize = "1-50" | "51-200" | "201-500" | "501-2000" | "2000+";

export interface TenantSettings {
  companyName: string;
  domain: string;
  industry: string;
  size: CompanySize;
  country: string;
  hrContactName: string;
  hrContactEmail: string;
  logoDataUrl?: string;
}

export interface Tenant {
  id: string;
  settings: TenantSettings;
  theme: TenantTheme;
  createdAt: string;
}

export type { TenantTheme };