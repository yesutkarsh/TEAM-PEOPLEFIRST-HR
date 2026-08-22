import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button, ConfirmDialog, EmptyState, SlideOver, Input, showToast } from "@/lib/components/ui";
import { PermissionGuard, RoleCard } from "@/lib/components/rbac";
import { listRoles, deleteRole, createRole } from "@/lib/api/rbac";
import type { Role } from "@/lib/types/rbac";

export const Route = createFileRoute("/_app/settings/roles/")({
  component: RolesListPage,
  head: () => ({ meta: [{ title: "Roles — Settings — HRMS" }] }),
});

function RolesListPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloneFrom, setCloneFrom] = useState<Role | null>(null);
  const [cloneName, setCloneName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Role | null>(null);

  const reload = () => {
    setLoading(true);
    void listRoles().then((r) => {
      if (r.data) setRoles(r.data);
      setLoading(false);
    });
  };
  useEffect(reload, []);

  const builtIn = roles.filter((r) => r.type === "built_in");
  const custom = roles.filter((r) => r.type === "custom");

  const doClone = async () => {
    if (!cloneFrom || !cloneName.trim()) return;
    const r = await createRole({
      name: cloneName.trim(),
      description: `Cloned from ${cloneFrom.name}`,
      permissions: cloneFrom.permissions,
      baseRoleId: cloneFrom.id,
    });
    if (r.data) {
      showToast("Role created.", "success");
      setCloneFrom(null);
      setCloneName("");
      navigate({ to: "/settings/roles/$roleId", params: { roleId: r.data.id } });
    }
  };

  const doDelete = async () => {
    if (!pendingDelete) return;
    await deleteRole(pendingDelete.id);
    showToast("Role deleted.", "success");
    setPendingDelete(null);
    reload();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <PermissionGuard permission="settings.roles.manage">
          <Button variant="primary" onClick={() => navigate({ to: "/settings/roles/new" })}>Create custom role</Button>
        </PermissionGuard>
      </div>

      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6B6B6B] mb-3">Built-in roles</p>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1, 2].map((i) => <div key={i} className="h-[180px] rounded-md border border-[#E5E5E3] bg-white animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {builtIn.map((r) => (
              <RoleCard
                key={r.id}
                role={r}
                onView={() => navigate({ to: "/settings/roles/$roleId", params: { roleId: r.id } })}
                onClone={() => { setCloneFrom(r); setCloneName(`${r.name} (Copy)`); }}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6B6B6B] mb-3">Custom roles</p>
        {custom.length === 0 ? (
          <EmptyState title="No custom roles yet" subtitle="Clone a built-in role to create one." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {custom.map((r) => (
              <RoleCard
                key={r.id}
                role={r}
                onView={() => navigate({ to: "/settings/roles/$roleId", params: { roleId: r.id } })}
                onClone={() => { setCloneFrom(r); setCloneName(`${r.name} (Copy)`); }}
                onEdit={() => navigate({ to: "/settings/roles/$roleId/edit", params: { roleId: r.id } })}
                onDelete={() => setPendingDelete(r)}
              />
            ))}
          </div>
        )}
      </section>

      <SlideOver
        open={!!cloneFrom}
        onClose={() => setCloneFrom(null)}
        title={`Clone "${cloneFrom?.name ?? ""}"`}
        description="Give your new custom role a name. Permissions are pre-filled from the source role."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCloneFrom(null)}>Cancel</Button>
            <Button variant="primary" onClick={doClone} disabled={!cloneName.trim()}>Create role</Button>
          </>
        }
      >
        <Input label="Role name" value={cloneName} onChange={(e) => setCloneName(e.target.value)} />
      </SlideOver>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={`Delete "${pendingDelete?.name ?? ""}"?`}
        description={
          pendingDelete && pendingDelete.employeeCount > 0
            ? `${pendingDelete.employeeCount} employees have this role. They will revert to the Employee role if you continue.`
            : "This action cannot be undone."
        }
        confirmLabel="Delete role"
        variant="danger"
        onConfirm={doDelete}
      />
    </div>
  );
}