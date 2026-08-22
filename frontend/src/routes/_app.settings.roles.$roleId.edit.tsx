import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Button, Input, Textarea, Spinner, showToast } from "@/lib/components/ui";
import { PermissionGuard } from "@/lib/components/rbac";
import { getRole, updateRole } from "@/lib/api/rbac";
import type { Role } from "@/lib/types/rbac";

export const Route = createFileRoute("/_app/settings/roles/$roleId/edit")({
  component: EditRolePage,
  head: () => ({ meta: [{ title: "Edit Role — Settings — HRMS" }] }),
});

function EditRolePage() {
  const { roleId } = useParams({ from: "/_app/settings/roles/$roleId/edit" });
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getRole(roleId).then((r) => {
      if (r.data) { setRole(r.data); setName(r.data.name); setDescription(r.data.description ?? ""); }
    });
  }, [roleId]);

  if (!role) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  const submit = async () => {
    setSaving(true);
    await updateRole(role.id, { name, description });
    setSaving(false);
    showToast("Role updated.", "success");
    navigate({ to: "/settings/roles/$roleId", params: { roleId: role.id } });
  };

  return (
    <PermissionGuard permission="settings.roles.manage">
      <div className="max-w-xl space-y-4">
        <h2 className="text-[18px] font-semibold">Edit role</h2>
        <Input label="Role name" value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea label="Description" rows={3} value={description} onChange={(e) => setDescription(e.target.value.slice(0, 200))} hint={`${description.length}/200`} />
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={() => navigate({ to: "/settings/roles/$roleId", params: { roleId: role.id } })}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={saving}>Save changes</Button>
        </div>
      </div>
    </PermissionGuard>
  );
}