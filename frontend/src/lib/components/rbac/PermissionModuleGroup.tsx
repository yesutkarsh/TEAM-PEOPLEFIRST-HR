import { useState } from "react";
import { cn } from "@/lib/utils";
import { PermissionToggle } from "./PermissionToggle";
import type { ModuleGroup, PermissionKey } from "@/lib/types/permissions";
import { isScoped } from "@/lib/types/permissions";
import type { PermissionEntry, PermissionScope } from "@/lib/types/rbac";

export interface PermissionModuleGroupProps {
  group: ModuleGroup;
  entries: PermissionEntry[];
  readOnly?: boolean;
  onChange: (next: PermissionEntry[]) => void;
}

export function PermissionModuleGroup({ group, entries, readOnly, onChange }: PermissionModuleGroupProps) {
  const [open, setOpen] = useState(true);
  const enabledKeys = new Set(entries.map((e) => e.key));
  const groupEnabled = group.permissions.filter((k) => enabledKeys.has(k)).length;

  const update = (k: PermissionKey, mut: (curr?: PermissionEntry) => PermissionEntry | null) => {
    const others = entries.filter((e) => e.key !== k);
    const next = mut(entries.find((e) => e.key === k));
    onChange(next ? [...others, next] : others);
  };

  const allOn = () => {
    const others = entries.filter((e) => !group.permissions.includes(e.key));
    const additions: PermissionEntry[] = group.permissions.map((k) => ({
      key: k,
      ...(isScoped(k) ? { scope: "all" as PermissionScope } : {}),
    }));
    onChange([...others, ...additions]);
  };
  const allOff = () => onChange(entries.filter((e) => !group.permissions.includes(e.key)));

  return (
    <div className="border border-[#E5E5E3] rounded-md bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E3]">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 text-left">
          <span aria-hidden className="text-[#6B6B6B] text-[12px]">{open ? "▼" : "▶"}</span>
          <span className="text-[14px] font-semibold text-[#0A0A0A]">{group.label}</span>
          <span className="text-[12px] text-[#6B6B6B]">{groupEnabled} of {group.permissions.length}</span>
        </button>
        {!readOnly && (
          <div className="flex items-center gap-3">
            <button type="button" onClick={allOn} className="text-[12px] text-[var(--tenant-primary)] hover:underline">All on</button>
            <button type="button" onClick={allOff} className="text-[12px] text-[#6B6B6B] hover:underline">All off</button>
          </div>
        )}
      </div>
      {open && (
        <div className={cn("p-2 space-y-0.5", readOnly && "opacity-80")}>
          {group.permissions.map((k) => (
            <PermissionToggle
              key={k}
              permissionKey={k}
              entry={entries.find((e) => e.key === k)}
              disabled={readOnly}
              onToggle={(on) =>
                update(k, () => (on ? { key: k, ...(isScoped(k) ? { scope: "all" } : {}) } : null))
              }
              onScopeChange={(scope) => update(k, (curr) => ({ key: k, ...(curr ?? {}), scope }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}