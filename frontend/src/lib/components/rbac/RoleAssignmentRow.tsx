import { useState } from "react";
import { SlideOver, Select, Textarea, Button } from "@/lib/components/ui";
import type { Employee } from "@/lib/types/employee";
import type { Role } from "@/lib/types/rbac";
import { EmployeeAvatar } from "@/lib/components/employees";
import { RoleBadge } from "./RoleBadge";

export interface RoleAssignmentRowProps {
  open: boolean;
  onClose: () => void;
  employee: Employee;
  currentRole: Role | null;
  roles: Role[];
  onSave: (roleId: string, reason?: string) => Promise<void> | void;
}

export function RoleAssignmentRow({ open, onClose, employee, currentRole, roles, onSave }: RoleAssignmentRowProps) {
  const [roleId, setRoleId] = useState(currentRole?.id ?? roles[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try { await onSave(roleId, reason || undefined); onClose(); } finally { setSaving(false); }
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Change role"
      description={`Update role for ${employee.firstName} ${employee.lastName}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={saving}>Save</Button>
        </>
      }
    >
      <div className="flex items-center gap-3 mb-5">
        <EmployeeAvatar employee={employee} size="md" />
        <div className="min-w-0">
          <p className="font-medium text-[14px]">{employee.firstName} {employee.lastName}</p>
          <p className="text-[12px] text-[#6B6B6B]">{employee.employeeCode}</p>
        </div>
        {currentRole && <RoleBadge roleName={currentRole.name} roleType={currentRole.type} size="sm" />}
      </div>
      <Select
        label="New role"
        value={roleId}
        onChange={(e) => setRoleId(e.target.value)}
        options={roles.map((r) => ({ value: r.id, label: `${r.name} — ${r.description ?? ""}` }))}
      />
      <div className="mt-4">
        <Textarea label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
      </div>
    </SlideOver>
  );
}