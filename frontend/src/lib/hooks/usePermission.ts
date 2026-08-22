/** Permission check hook — reads from rbacStore. Sync, memoised. */
import { useMemo } from "react";
import { rbacStore } from "../store/rbac";
import type { PermissionKey } from "../types/permissions";

export function usePermission(key: PermissionKey): boolean;
export function usePermission(keys: PermissionKey[], mode?: "any" | "all"): boolean;
export function usePermission(input: PermissionKey | PermissionKey[], mode: "any" | "all" = "any"): boolean {
  const permissions = rbacStore.useSelector((s) => s.permissions);
  return useMemo(() => {
    const set = new Set(permissions.map((p) => p.key));
    if (typeof input === "string") return set.has(input);
    if (mode === "all") return input.every((k) => set.has(k));
    return input.some((k) => set.has(k));
  }, [permissions, input, mode]);
}