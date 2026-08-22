import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button, Card, DataTable, EmptyState, Input, Select, SlideOver, Textarea, ConfirmDialog, type ColumnDef } from "@/lib/components/ui";
import { showToast } from "@/lib/components/ui/Toast";
import { settingsApi, type Department } from "@/lib/api/settings";

export const Route = createFileRoute("/_app/settings/company/departments")({
  component: DepartmentsPage,
  head: () => ({ meta: [{ title: "Departments — Settings — HRMS" }] }),
});

function DepartmentsPage() {
  const [list, setList] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Department | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: "", parentId: "", description: "" });

  const load = async () => {
    setLoading(true);
    const r = await settingsApi.listDepartments();
    if (r.data) setList(r.data);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ name: "", parentId: "", description: "" }); setOpen(true); };
  const openEdit = (d: Department) => { setEditing(d); setForm({ name: d.name, parentId: d.parentId ?? "", description: d.description ?? "" }); setOpen(true); };

  const save = async () => {
    if (!form.name.trim()) { showToast("Department name is required", "error"); return; }
    const res = await settingsApi.upsertDepartment({
      id: editing?.id,
      name: form.name.trim(),
      parentId: form.parentId || null,
      description: form.description.trim() || undefined,
    });
    if (res.error) { showToast(res.error.message, "error"); return; }
    setOpen(false);
    showToast(editing ? "Department updated" : "Department added", "success");
    await load();
  };

  const remove = async () => {
    if (!deleteTarget) return;
    await settingsApi.deleteDepartment(deleteTarget.id);
    showToast("Department deleted", "success");
    await load();
  };

  const columns: ColumnDef<Department>[] = [
    { key: "name", label: "Department", sortable: true, render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "parentId", label: "Parent", render: (r) => list.find((d) => d.id === r.parentId)?.name ?? "—" },
    { key: "headName", label: "Head", render: (r) => r.headName ?? "—" },
    { key: "employeeCount", label: "Employees", align: "right", sortable: true, render: (r) => r.employeeCount.toLocaleString() },
    { key: "actions", label: "", align: "right", render: (r) => (
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
        <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(r)}>Delete</Button>
      </div>
    ) },
  ];

  const parentOptions = [{ value: "", label: "None (top level)" }, ...list.filter((d) => d.id !== editing?.id).map((d) => ({ value: d.id, label: d.name }))];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-[20px] font-semibold">Departments</h2>
          <p className="text-[13px] text-[#6B6B6B] mt-1">Organise your company structure.</p>
        </div>
        <Button onClick={openAdd}>+ Add department</Button>
      </div>
      <DataTable
        columns={columns}
        data={list}
        loading={loading}
        getRowKey={(d) => d.id}
        emptyState={<EmptyState title="No departments yet." subtitle="Add your first department to start organising your company." action={<Button onClick={openAdd}>Add department</Button>} />}
      />
      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit department" : "New department"}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></>}
      >
        <div className="space-y-5">
          <Input label="Department name" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Parent department" options={parentOptions} value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} />
          <Textarea label="Description" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </SlideOver>
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete department?"
        description={deleteTarget && deleteTarget.employeeCount > 0
          ? `This department has ${deleteTarget.employeeCount} employees. Reassign them before deleting.`
          : `Delete ${deleteTarget?.name}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={remove}
      />
    </div>
  );
}
