import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button, Input, Textarea, Select, showToast, Alert } from "@/lib/components/ui";
import { PermissionGuard, PermissionMatrix } from "@/lib/components/rbac";
import { createRole, listRoles } from "@/lib/api/rbac";
import type { PermissionEntry, Role } from "@/lib/types/rbac";

export const Route = createFileRoute("/_app/settings/roles/new")({
  component: NewRolePage,
  head: () => ({ meta: [{ title: "Create Role — Settings — HRMS" }] }),
});

function NewRolePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseRoleId, setBaseRoleId] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [perms, setPerms] = useState<PermissionEntry[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void listRoles().then((r) => {
      if (r.data) {
        const built = r.data.filter((x) => x.type === "built_in");
        setRoles(r.data);
        const emp = built.find((x) => x.name === "Employee") ?? built[0];
        if (emp) {
          setBaseRoleId(emp.id);
          setPerms(emp.permissions);
        }
      }
    });
  }, []);

  const onBaseChange = (id: string) => {
    setBaseRoleId(id);
    if (id === "scratch") { setPerms([]); return; }
    const base = roles.find((r) => r.id === id);
    if (base) setPerms(base.permissions);
  };

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const r = await createRole({ name, description, permissions: perms, baseRoleId });
    setSaving(false);
    if (r.data) {
      showToast("Role created.", "success");
      navigate({ to: "/settings/roles/$roleId", params: { roleId: r.data.id } });
    }
  };

  return (
    <PermissionGuard permission="settings.roles.manage" fallback={<Alert variant="error">You don't have permission to create roles.</Alert>}>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Input label="Role name *" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Finance Lead" />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 200))}
            rows={3}
            hint={`${description.length}/200`}
          />
          <Select
            label="Base this on"
            value={baseRoleId}
            onChange={(e) => onBaseChange(e.target.value)}
            options={[
              ...roles.filter((r) => r.type === "built_in").map((r) => ({ value: r.id, label: r.name })),
              { value: "scratch", label: "Start from scratch" },
            ]}
          />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => navigate({ to: "/settings/roles" })}>Cancel</Button>
            <Button variant="primary" onClick={submit} loading={saving} disabled={!name.trim()}>Create role →</Button>
          </div>
        </div>
        <div className="lg:col-span-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6B6B6B] mb-3">Permissions ({perms.length})</p>
          <PermissionMatrix value={perms} onChange={setPerms} />
        </div>
      </div>
    </PermissionGuard>
  );
}