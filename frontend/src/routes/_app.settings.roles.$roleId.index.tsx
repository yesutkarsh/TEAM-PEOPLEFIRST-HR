import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Button, Alert, Spinner, EmptyState, showToast } from "@/lib/components/ui";
import { PermissionMatrix, RoleBadge, PermissionGuard } from "@/lib/components/rbac";
import { getRole, updateRole } from "@/lib/api/rbac";
import type { PermissionEntry, Role } from "@/lib/types/rbac";

export const Route = createFileRoute("/_app/settings/roles/$roleId/")({
  component: RoleDetailPage,
  head: () => ({ meta: [{ title: "Role — Settings — HRMS" }] }),
});

function RoleDetailPage() {
  const { roleId } = useParams({ from: "/_app/settings/roles/$roleId/" });
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);
  const [perms, setPerms] = useState<PermissionEntry[]>([]);
  const [original, setOriginal] = useState<PermissionEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getRole(roleId).then((r) => {
      if (r.data) {
        setRole(r.data);
        setPerms(r.data.permissions);
        setOriginal(r.data.permissions);
      }
      setLoading(false);
    });
  }, [roleId]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
  if (!role) return <EmptyState title="Role not found" />;

  const dirty = JSON.stringify(perms) !== JSON.stringify(original);
  const readOnly = role.type === "built_in";

  const save = async () => {
    setSaving(true);
    const r = await updateRole(role.id, { permissions: perms });
    setSaving(false);
    if (r.data) {
      setOriginal(r.data.permissions);
      showToast("Permissions saved.", "success");
    }
  };

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-[20px] font-bold tracking-[-0.01em]">{role.name}</h2>
            <RoleBadge roleName={readOnly ? "Built-in" : "Custom"} roleType={role.type} size="sm" />
          </div>
          <p className="text-[13px] text-[#6B6B6B]">{role.description ?? "—"}</p>
          <button
            type="button"
            onClick={() => navigate({ to: "/settings/roles/assignments" })}
            className="mt-1 text-[12px] text-[var(--tenant-primary)] hover:underline"
          >
            {role.employeeCount} employee{role.employeeCount === 1 ? "" : "s"} assigned →
          </button>
        </div>
        <div className="flex gap-2">
          {readOnly ? (
            <PermissionGuard permission="settings.roles.manage">
              <Button variant="secondary" onClick={() => navigate({ to: "/settings/roles/new", search: { from: role.id } as never })}>Clone to customise →</Button>
            </PermissionGuard>
          ) : (
            <PermissionGuard permission="settings.roles.manage">
              <Button variant="secondary" size="sm" onClick={() => navigate({ to: "/settings/roles/$roleId/edit", params: { roleId: role.id } })}>Edit name &amp; description</Button>
            </PermissionGuard>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <PermissionMatrix value={perms} onChange={setPerms} readOnly={readOnly} />
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-4 rounded-md border border-[#E5E5E3] bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] mb-3">Summary</p>
            <p className="text-[24px] font-bold text-[#0A0A0A]">{perms.length}</p>
            <p className="text-[12px] text-[#6B6B6B]">permissions enabled</p>
          </div>
        </aside>
      </div>

      {dirty && !readOnly && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-3 rounded-lg bg-[#0A0A0A] text-white shadow-2xl">
          <span className="text-[13px]">You have unsaved changes.</span>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => setPerms(original)}>Discard</Button>
          <Button variant="primary" size="sm" onClick={save} loading={saving}>Save changes →</Button>
        </div>
      )}
    </div>
  );
}