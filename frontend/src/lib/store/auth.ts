/** Authenticated user session + super admin session + impersonation. */
import { createStore } from "./createStore";
import type { User } from "../types/user";
import { rbacStore } from "./rbac";

const STORAGE_KEY = "hrms.auth";
const ADMIN_KEY = "hrms.adminAuth";
const IMP_KEY = "hrms.impersonation";

interface AuthState {
  user: User | null;
  token: string | null;
}

interface AdminAuthState {
  token: string | null;
  name: string | null;
}

export interface Impersonation {
  tenantId: string;
  companyName: string;
  startedAt: string;
}

interface ImpersonationStateWrapper {
  current: Impersonation | null;
}

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

const store = createStore<AuthState>(load(STORAGE_KEY, { user: null, token: null }));
const adminStore = createStore<AdminAuthState>(load(ADMIN_KEY, { token: null, name: null }));
const impersonationStore = createStore<ImpersonationStateWrapper>({
  current: load<Impersonation | null>(IMP_KEY, null),
});

function persist(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  if (value === null || value === undefined) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

export const authStore = {
  ...store,
  signIn(user: User, token: string) {
    store.set({ user, token });
    persist(STORAGE_KEY, { user, token });
    rbacStore.refresh(user.id, user.role);
  },
  signOut() {
    store.set({ user: null, token: null });
    persist(STORAGE_KEY, null);
    rbacStore.refresh(null);
  },
  get isAuthenticated() { return store.get().user !== null; },
};

export const adminAuthStore = {
  ...adminStore,
  signIn(name: string, token: string) {
    adminStore.set({ token, name });
    persist(ADMIN_KEY, { token, name });
  },
  signOut() {
    adminStore.set({ token: null, name: null });
    persist(ADMIN_KEY, null);
  },
  get isAuthenticated() { return adminStore.get().token !== null; },
};

export const impersonationStateStore = {
  ...impersonationStore,
  start(tenantId: string, companyName: string) {
    const state: Impersonation = { tenantId, companyName, startedAt: new Date().toISOString() };
    impersonationStore.set({ current: state });
    persist(IMP_KEY, state);
  },
  stop() {
    impersonationStore.set({ current: null });
    persist(IMP_KEY, null);
  },
};
