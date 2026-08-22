/** SlideOver for creating a new custom top-level navigation item. */
import { useState } from "react";
import { Button, Checkbox, Input, SlideOver } from "@/lib/components/ui";
import { IconPicker } from "./IconPicker";
import type { Role } from "@/lib/types/rbac";

export interface AddCustomNavItemFormProps {
  open: boolean;
  roles: Role[];
  onClose: () => void;
  onCreate: (input: { label: string; icon: string; allowedRoleIds: string[] }) => Promise<void> | void;
}

export function AddCustomNavItemForm({ open, roles, onClose, onCreate }: AddCustomNavItemFormProps) {
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("ClipboardList");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>();

  const submit = async () => {
    if (!label.trim()) { setError("Label is required."); return; }
    setError(undefined);
    await onCreate({ label: label.trim(), icon, allowedRoleIds: roleIds });
    setLabel("");
    setIcon("ClipboardList");
    setRoleIds([]);
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Add navigation item"
      description="Creates a new item in the CUSTOM section at the bottom of the sidebar."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => void submit()}>Create</Button></>}
    >
      <div className="space-y-6">
        <Input label="Label" placeholder="e.g. Asset Requests" value={label} error={error} onChange={(e) => setLabel(e.target.value)} />
        <IconPicker value={icon} onChange={setIcon} />
        <div>
          <p className="mb-2 text-[13px] font-medium text-[#0A0A0A]">Visible to</p>
          <div className="space-y-2">
            {roles.map((r) => (
              <Checkbox
                key={r.id}
                label={r.name}
                checked={roleIds.includes(r.id)}
                onChange={() => setRoleIds((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))}
              />
            ))}
          </div>
        </div>
        <p className="text-[12px] text-[#6B6B6B]">
          Created with zero forms attached — build a form in Forms and attach it here.
        </p>
      </div>
    </SlideOver>
  );
}