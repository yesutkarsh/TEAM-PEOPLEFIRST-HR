/** Wizard state that persists across step navigations. */
import { createStore } from "./createStore";
import type { TenantSettings, CompanySize } from "../types/tenant";
import type { TenantTheme } from "../themes/types";
import { DEFAULT_THEME } from "../themes/defaults";

export interface OnboardingDraft {
  companyName: string;
  domain: string;
  industry: string;
  size: CompanySize | "";
  country: string;
  hrContactName: string;
  hrContactEmail: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoDataUrl?: string;
  adminFullName: string;
  adminPassword: string;
}

const initial: OnboardingDraft = {
  companyName: "",
  domain: "",
  industry: "",
  size: "",
  country: "",
  hrContactName: "",
  hrContactEmail: "",
  primaryColor: DEFAULT_THEME.primaryColor,
  secondaryColor: DEFAULT_THEME.secondaryColor,
  accentColor: DEFAULT_THEME.accentColor,
  adminFullName: "",
  adminPassword: "",
};

const STORAGE_KEY = "hrms.onboarding";

function load(): OnboardingDraft {
  if (typeof window === "undefined") return initial;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...initial, ...(JSON.parse(raw) as OnboardingDraft) } : initial;
  } catch {
    return initial;
  }
}

const store = createStore<OnboardingDraft>(load());

export const onboardingStore = {
  ...store,
  update(patch: Partial<OnboardingDraft>) {
    store.set(patch);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store.get()));
    }
  },
  reset() {
    store.reset();
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
  },
  toSettings(): TenantSettings {
    const s = store.get();
    return {
      companyName: s.companyName,
      domain: s.domain,
      industry: s.industry,
      size: (s.size || "1-50") as CompanySize,
      country: s.country,
      hrContactName: s.hrContactName,
      hrContactEmail: s.hrContactEmail,
      logoDataUrl: s.logoDataUrl,
    };
  },
  toTheme(): TenantTheme {
    const s = store.get();
    return {
      primaryColor: s.primaryColor,
      secondaryColor: s.secondaryColor,
      accentColor: s.accentColor,
      textOnPrimary: "#FFFFFF",
      textOnSecondary: "#0A0A0A",
    };
  },
};