import { Card, Button, Badge } from "@/lib/components/ui";
import { RoleBadge } from "./RoleBadge";
import type { Role } from "@/lib/types/rbac";

export interface RoleCardProps {
  role: Role;
  onView: () => void;
  onClone: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function RoleCard({ role, onView, onClone, onEdit, onDelete }: RoleCardProps) {
  const builtIn = role.type === "built_in";
  return (
    <Card className="flex flex-col gap-3 h-full">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold text-[#0A0A0A] truncate">{role.name}</h3>
          <p className="text-[12px] text-[#6B6B6B] line-clamp-2 mt-0.5">
            {role.description ?? (builtIn ? "Built-in role." : "Custom role.")}
          </p>
        </div>
        <RoleBadge roleName={builtIn ? "Built-in" : "Custom"} roleType={role.type} size="sm" />
      </div>
      <div className="flex items-center gap-2 mt-auto">
        <Badge variant="default">{role.employeeCount} employee{role.employeeCount === 1 ? "" : "s"}</Badge>
        {builtIn && <span aria-hidden className="text-[12px] text-[#9CA3AF]">🔒</span>}
      </div>
      <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E5E5E3]">
        <Button variant="secondary" size="sm" onClick={onView}>View permissions</Button>
        <Button variant="ghost" size="sm" onClick={onClone}>Clone →</Button>
        {!builtIn && onEdit && <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>}
        {!builtIn && onDelete && <Button variant="ghost" size="sm" onClick={onDelete}>Delete</Button>}
      </div>
    </Card>
  );
}