/**
 * Role visibility editor for one sidebar item.
 *
 * NARROW-ONLY RULE (Phase 12, Edge case 5):
 * For `built_in` items, allowedRoleIds / isHidden can only ever *restrict*
 * visibility further than the item's own Phase 4 permission already allows.
 * Ticking a role here never grants access to a role that lacks the underlying
 * permission — the sidebar's visibility resolution always ANDs this config with
 * the real permission check, and route-level PermissionGuards remain the real
 * boundary. This keeps navigation config from becoming a second, conflicting
 * permission system.
 */
import { useState } from "react";
import { Button, Checkbox, Input, SlideOver, Toggle } from "@/lib/components/ui";
import { IconPicker } from "./IconPicker";
import type { SidebarItemConfig } from "@/lib/types/navigation";
import type { Role } from "@/lib/types/rbac";

export interface SidebarItemVisibilityEditorProps {
  open: boolean;
  item: SidebarItemConfig | null;
  roles: Role[];
  onClose: () => void;
  onSave: (patch: Partial<SidebarItemConfig>) => Promise<void> | void;
}

export function SidebarItemVisibilityEditor({ open, item, roles, onClose, onSave }: SidebarItemVisibilityEditorProps) {
  const [label, setLabel] = useState(item?.label ?? "");
  const [icon, setIcon] = useState(item?.icon ?? "ClipboardList");
  const [roleIds, setRoleIds] = useState<string[]>(item?.allowedRoleIds ?? []);
  const [hidden, setHidden] = useState(item?.isHidden ?? false);
  const [key, setKey] = useState(item?.id);

  // resync when a different item is opened
  if (item && key !== item.id) {
    setKey(item.id);
    setLabel(item.label);
    setIcon(item.icon ?? "ClipboardList");
    setRoleIds(item.allowedRoleIds);
    setHidden(item.isHidden);
  }

  if (!item) return null;
  const isBuiltIn = item.kind === "built_in";

  const toggleRole = (id: string) =>
    setRoleIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={item.label}
      description={isBuiltIn ? "Built-in navigation item" : "Custom navigation item"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => void onSave(isBuiltIn ? { allowedRoleIds: roleIds, isHidden: hidden } : { label: label.trim() || item.label, icon, allowedRoleIds: roleIds, isHidden: hidden })}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {isBuiltIn ? (
          <p className="text-[13px] text-[#6B6B6B]">
            Default route: <span className="font-mono">{item.basePath}</span>
          </p>
        ) : (
          <>
            <Input label="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
            <IconPicker value={icon} onChange={setIcon} />
          </>
        )}

        <div>
          <p className="mb-2 text-[13px] font-medium text-[#0A0A0A]">Visible to</p>
          <div className="space-y-2">
            {roles.map((r) => (
              <Checkbox
                key={r.id}
                label={r.name}
                checked={roleIds.includes(r.id)}
                onChange={() => toggleRole(r.id)}
              />
            ))}
          </div>
          {isBuiltIn && (
            <p className="mt-2 text-[12px] text-[#6B6B6B]">
              This can only narrow visibility — it cannot grant access beyond existing permissions.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between rounded-md border border-[#E5E5E3] bg-white px-3 py-2.5">
          <span className="text-[13px]">Hide this item entirely</span>
          <Toggle checked={hidden} onChange={setHidden} label="Hide this item entirely" />
        </div>
      </div>
    </SlideOver>
  );
}