import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataTable, Input, Select, showToast, type ColumnDef } from "@/lib/components/ui";
import { EmployeeAvatar } from "@/lib/components/employees";
import { PermissionGuard, RoleAssignmentRow, RoleBadge } from "@/lib/components/rbac";
import { listEmployees } from "@/lib/api/employees";
import { settingsApi, type Department } from "@/lib/api/settings";
import { assignRole, listAssignments, listRoles } from "@/lib/api/rbac";
import { BUILT_IN_ROLE_IDS, type Role, type UserRoleAssignment } from "@/lib/types/rbac";
import type { Employee } from "@/lib/types/employee";

export const Route = createFileRoute("/_app/settings/roles/assignments")({
  component: AssignmentsPage,
  head: () => ({ meta: [{ title: "Role Assignments — Settings — HRMS" }] }),
});

function AssignmentsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [assignments, setAssignments] = useState<UserRoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [editing, setEditing] = useState<Employee | null>(null);

  const reload = () => {
    setLoading(true);
    void Promise.all([listEmployees(), settingsApi.listDepartments(), listRoles(), listAssignments()]).then(
      ([em, d, rl, as]) => {
        if (em.data) setEmployees(em.data);
        if (d.data) setDepartments(d.data);
        if (rl.data) setRoles(rl.data);
        if (as.data) setAssignments(as.data);
        setLoading(false);
      },
    );
  };
  useEffect(reload, []);

  const roleFor = (eid: string): Role | null => {
    const a = assignments.find((x) => x.employeeId === eid);
    const id = a?.roleId ?? BUILT_IN_ROLE_IDS.employee;
    return roles.find((r) => r.id === id) ?? null;
  };
  const deptName = (id: string) => departments.find((d) => d.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (q && !`${e.firstName} ${e.lastName} ${e.employeeCode}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (deptFilter && e.departmentId !== deptFilter) return false;
      if (roleFilter && roleFor(e.id)?.id !== roleFilter) return false;
      return true;
    });
  }, [employees, q, deptFilter, roleFilter, assignments, roles]);

  const columns: ColumnDef<Employee>[] = [
    {
      key: "name", label: "Employee",
      render: (e) => (
        <div className="flex items-center gap-3">
          <EmployeeAvatar employee={e} size="sm" />
          <div>
            <p className="font-medium text-[14px]">{e.firstName} {e.lastName}</p>
            <p className="text-[12px] text-[#6B6B6B]">{e.employeeCode}</p>
          </div>
        </div>
      ),
    },
    { key: "dept", label: "Department", render: (e) => deptName(e.departmentId) },
    {
      key: "role", label: "Current role",
      render: (e) => {
        const r = roleFor(e.id);
        return r ? <RoleBadge roleName={r.name} roleType={r.type} size="sm" /> : "—";
      },
    },
    {
      key: "assignedAt", label: "Assigned on",
      render: (e) => {
        const a = assignments.find((x) => x.employeeId === e.id);
        return a ? new Date(a.assignedAt).toLocaleDateString() : "—";
      },
    },
    {
      key: "actions", label: "", align: "right",
      render: (e) => (
        <PermissionGuard permission="settings.roles.manage">
          <button onClick={() => setEditing(e)} className="text-[12px] text-[var(--tenant-primary)] hover:underline">Change role</button>
        </PermissionGuard>
      ),
    },
  ];

  const onSave = async (roleId: string) => {
    if (!editing) return;
    const role = roles.find((r) => r.id === roleId);
    await assignRole(editing.id, roleId, `${editing.firstName} ${editing.lastName}`, role?.name);
    showToast("Role updated.", "success");
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input placeholder="Search by name or code" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select placeholder="All roles" options={roles.map((r) => ({ value: r.id, label: r.name }))} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} />
        <Select placeholder="All departments" options={departments.map((d) => ({ value: d.id, label: d.name }))} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} />
      </div>
      <DataTable columns={columns} data={filtered} loading={loading} getRowKey={(e) => e.id} />
      {editing && (
        <RoleAssignmentRow
          open={!!editing}
          onClose={() => setEditing(null)}
          employee={editing}
          currentRole={roleFor(editing.id)}
          roles={roles}
          onSave={onSave}
        />
      )}
    </div>
  );
}