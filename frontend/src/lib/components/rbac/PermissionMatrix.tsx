import { MODULE_GROUPS } from "@/lib/types/permissions";
import type { PermissionEntry } from "@/lib/types/rbac";
import { PermissionModuleGroup } from "./PermissionModuleGroup";

export interface PermissionMatrixProps {
  value: PermissionEntry[];
  onChange: (next: PermissionEntry[]) => void;
  readOnly?: boolean;
}

export function PermissionMatrix({ value, onChange, readOnly }: PermissionMatrixProps) {
  return (
    <div className="space-y-3">
      {readOnly && (
        <div className="rounded-md bg-[#FEF3C7] border border-[#FCD34D] px-3 py-2 text-[13px] text-[#92400E]">
          This is a built-in role. Permissions cannot be changed. Clone it to customise.
        </div>
      )}
      {MODULE_GROUPS.map((g) => (
        <PermissionModuleGroup
          key={g.label}
          group={g}
          entries={value.filter((e) => g.permissions.includes(e.key))}
          readOnly={readOnly}
          onChange={(groupEntries) => {
            const others = value.filter((e) => !g.permissions.includes(e.key));
            onChange([...others, ...groupEntries]);
          }}
        />
      ))}
    </div>
  );
}