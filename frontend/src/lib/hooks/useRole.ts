/** Convenience hook — current user's role + role-type flags. */
import { rbacStore } from "../store/rbac";
import { BUILT_IN_ROLE_IDS } from "../types/rbac";

export function useRole() {
  const role = rbacStore.useSelector((s) => s.role);
  return {
    role,
    isHRAdmin: role?.id === BUILT_IN_ROLE_IDS.hrAdmin,
    isManager: role?.id === BUILT_IN_ROLE_IDS.manager,
    isEmployee: role?.id === BUILT_IN_ROLE_IDS.employee,
  };
}