/** Current tenant + theme state. Persisted to localStorage. */
import { createStore } from "./createStore";
import type { Tenant } from "../types/tenant";
import type { TenantTheme } from "../themes/types";
import { DEFAULT_THEME } from "../themes/defaults";

const STORAGE_KEY = "hrms.tenant";

interface TenantState {
  tenant: Tenant | null;
  theme: TenantTheme;
}

function load(): TenantState {
  if (typeof window === "undefined") return { tenant: null, theme: DEFAULT_THEME };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tenant: null, theme: DEFAULT_THEME };
    const t = JSON.parse(raw) as Tenant;
    return { tenant: t, theme: t.theme };
  } catch {
    return { tenant: null, theme: DEFAULT_THEME };
  }
}

const store = createStore<TenantState>(load());

function persist(t: Tenant | null) {
  if (typeof window === "undefined") return;
  if (t) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  else window.localStorage.removeItem(STORAGE_KEY);
}

export const tenantStore = {
  ...store,
  setTenant(t: Tenant | null) {
    store.set({ tenant: t, theme: t?.theme ?? DEFAULT_THEME });
    persist(t);
  },
  updateTheme(theme: TenantTheme) {
    const t = store.get().tenant;
    if (!t) {
      store.set({ theme });
      return;
    }
    const next: Tenant = { ...t, theme };
    store.set({ tenant: next, theme });
    persist(next);
  },
};