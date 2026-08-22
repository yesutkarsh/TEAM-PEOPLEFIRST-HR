/** Renders children only if the current user has the required permission(s). */
import type { ReactNode } from "react";
import { usePermission } from "@/lib/hooks/usePermission";
import type { PermissionKey } from "@/lib/types/permissions";

export interface PermissionGuardProps {
  permission: PermissionKey | PermissionKey[];
  mode?: "any" | "all";
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGuard({ permission, mode = "any", fallback = null, children }: PermissionGuardProps) {
  const allowed = Array.isArray(permission)
    ? usePermission(permission, mode)
    : usePermission(permission);
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}