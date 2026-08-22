/** Reactive store of the logged-in user's effective permissions. */
import { createStore } from "./createStore";
import { getEffectivePermissionsSync, type EffectivePermissions } from "../api/rbac";

const initial: EffectivePermissions = { roleId: null, role: null, permissions: [] };
const store = createStore<EffectivePermissions>(initial);

export const rbacStore = {
  ...store,
  refresh(employeeId: string | null | undefined, userRoleOverride?: string) {
    if (!employeeId) {
      store.set(initial);
      return;
    }
    store.set(getEffectivePermissionsSync(employeeId, userRoleOverride));
  },
};