import { Toggle } from "@/lib/components/ui/Toggle";
import { InfoTooltip } from "@/lib/components/ui/InfoTooltip";
import { ScopeSelector } from "./ScopeSelector";
import { PERMISSIONS, isScoped, type PermissionKey } from "@/lib/types/permissions";
import type { PermissionEntry, PermissionScope } from "@/lib/types/rbac";

export interface PermissionToggleProps {
  permissionKey: PermissionKey;
  entry?: PermissionEntry;
  disabled?: boolean;
  onToggle: (on: boolean) => void;
  onScopeChange: (scope: PermissionScope) => void;
}

export function PermissionToggle({ permissionKey, entry, disabled, onToggle, onScopeChange }: PermissionToggleProps) {
  const on = !!entry;
  const scoped = isScoped(permissionKey);
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-[#FAFAF8]">
      <Toggle checked={on} onChange={onToggle} disabled={disabled} size="sm" label={PERMISSIONS[permissionKey]} />
      <span className="text-[13px] text-[#0A0A0A] flex-1">{PERMISSIONS[permissionKey]}</span>
      {on && scoped && (
        <ScopeSelector value={entry?.scope ?? "all"} onChange={onScopeChange} disabled={disabled} />
      )}
      {!scoped && on && (
        <span className="text-[11px] text-[#9CA3AF] italic">global</span>
      )}
      <InfoTooltip content={permissionKey} />
    </div>
  );
}