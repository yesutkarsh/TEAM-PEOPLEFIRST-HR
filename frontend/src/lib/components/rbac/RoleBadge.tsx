import { cn } from "@/lib/utils";
import type { RoleType } from "@/lib/types/rbac";

export interface RoleBadgeProps {
  roleName: string;
  roleType: RoleType;
  size?: "sm" | "md";
  className?: string;
}

export function RoleBadge({ roleName, roleType, size = "md", className }: RoleBadgeProps) {
  const sz = size === "sm" ? "text-[11px] px-1.5 py-0.5" : "text-[12px] px-2 py-0.5";
  if (roleType === "built_in") {
    return (
      <span className={cn("inline-flex items-center rounded-md bg-[#0A0A0A] text-white font-medium", sz, className)}>
        {roleName}
      </span>
    );
  }
  return (
    <span
      className={cn("inline-flex items-center rounded-md font-medium", sz, className)}
      style={{
        background: "color-mix(in srgb, var(--tenant-accent) 20%, transparent)",
        color: "var(--tenant-accent)",
      }}
    >
      {roleName}
    </span>
  );
}