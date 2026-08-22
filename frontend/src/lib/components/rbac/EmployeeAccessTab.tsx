import { useEffect, useState } from "react";
import { Card, Button, EmptyState, showToast } from "@/lib/components/ui";
import { RoleBadge } from "./RoleBadge";
import { RoleAssignmentRow } from "./RoleAssignmentRow";
import { PermissionGuard } from "./PermissionGuard";
import { DelegationCard } from "./DelegationCard";
import { assignRole, listAssignments, listDelegations, listRoles, getEffectivePermissionsSync, revokeDelegation } from "@/lib/api/rbac";
import { listEmployees } from "@/lib/api/employees";
import { BUILT_IN_ROLE_IDS, type Delegation, type Role, type UserRoleAssignment } from "@/lib/types/rbac";
import { PERMISSIONS } from "@/lib/types/permissions";
import type { Employee } from "@/lib/types/employee";

export function EmployeeAccessTab({ employee }: { employee: Employee }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [assignment, setAssignment] = useState<UserRoleAssignment | null>(null);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editing, setEditing] = useState(false);
  const [showPerms, setShowPerms] = useState(false);

  const reload = () => {
    void Promise.all([listRoles(), listAssignments(), listDelegations(), listEmployees()]).then(([rl, asg, dl, em]) => {
      if (rl.data) setRoles(rl.data);
      if (asg.data) setAssignment(asg.data.find((a) => a.employeeId === employee.id) ?? null);
      if (dl.data) setDelegations(dl.data);
      if (em.data) setEmployees(em.data);
    });
  };
  useEffect(reload, [employee.id]);

  const roleId = assignment?.roleId ?? BUILT_IN_ROLE_IDS.employee;
  const role = roles.find((r) => r.id === roleId) ?? null;
  const empName = (id: string) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.firstName} ${e.lastName}` : id;
  };
  const roleName = (id?: string) => roles.find((r) => r.id === id)?.name ?? "Role";

  const mine = delegations.filter((d) => (d.fromEmployeeId === employee.id || d.toEmployeeId === employee.id) && d.status === "active");
  const effective = getEffectivePermissionsSync(employee.id, employee.role).permissions;

  const onSave = async (newRoleId: string) => {
    const r = roles.find((x) => x.id === newRoleId);
    await assignRole(employee.id, newRoleId, `${employee.firstName} ${employee.lastName}`, r?.name);
    showToast("Role updated.", "success");
    reload();
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#6B6B6B] mb-1">Current role</p>
            <div className="flex items-center gap-2">
              {role ? <RoleBadge roleName={role.name} roleType={role.type} /> : "—"}
            </div>
            {assignment && (
              <p className="text-[12px] text-[#6B6B6B] mt-1">
                Assigned {new Date(assignment.assignedAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <PermissionGuard permission="settings.roles.manage">
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Change role</Button>
          </PermissionGuard>
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="text-[11px] uppercase tracking-wider text-[#6B6B6B]">Active delegations</p>
        {mine.length === 0 ? <p className="text-[13px] text-[#6B6B6B]">No active delegations for this employee.</p> : mine.map((d) => (
          <DelegationCard key={d.id} delegation={d} fromName={empName(d.fromEmployeeId)} toName={empName(d.toEmployeeId)} roleName={roleName(d.roleId)} onRevoke={async (id) => { await revokeDelegation(id); reload(); }} />
        ))}
      </Card>

      <Card>
        <button type="button" onClick={() => setShowPerms((v) => !v)} className="text-[13px] text-[var(--tenant-primary)] hover:underline">
          {showPerms ? "Hide" : "View"} effective permissions ({effective.length})
        </button>
        {showPerms && (
          <>
            {effective.length === 0 ? (
              <EmptyState title="No permissions assigned" />
            ) : (
              <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {effective.map((p) => (
                  <li key={p.key} className="text-[12px] flex items-center gap-2">
                    <span className="text-[#0A0A0A]">{PERMISSIONS[p.key]}</span>
                    {p.scope && <span className="text-[10px] uppercase tracking-wider text-[#6B6B6B]">{p.scope}</span>}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>

      {editing && (
        <RoleAssignmentRow
          open={editing}
          onClose={() => setEditing(false)}
          employee={employee}
          currentRole={role}
          roles={roles}
          onSave={onSave}
        />
      )}
    </div>
  );
}