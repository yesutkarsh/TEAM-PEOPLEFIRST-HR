import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button, DataTable, EmptyState, Input, SlideOver, Textarea, ConfirmDialog, type ColumnDef } from "@/lib/components/ui";
import { showToast } from "@/lib/components/ui/Toast";
import { settingsApi, type Department, type Designation } from "@/lib/api/settings";

export const Route = createFileRoute("/_app/settings/company/designations")({
  component: DesignationsPage,
  head: () => ({ meta: [{ title: "Designations — Settings — HRMS" }] }),
});

function DesignationsPage() {
  const [list, setList] = useState<Designation[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Designation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Designation | null>(null);
  const [form, setForm] = useState({ name: "", grade: "", departmentIds: [] as string[], description: "" });

  const load = async () => {
    setLoading(true);
    const [d, ds] = await Promise.all([settingsApi.listDesignations(), settingsApi.listDepartments()]);
    if (d.data) setList(d.data);
    if (ds.data) setDepts(ds.data);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ name: "", grade: "", departmentIds: [], description: "" }); setOpen(true); };
  const openEdit = (d: Designation) => { setEditing(d); setForm({ name: d.name, grade: d.grade, departmentIds: d.departmentIds, description: d.description ?? "" }); setOpen(true); };

  const save = async () => {
    if (!form.name.trim()) { showToast("Designation name is required", "error"); return; }
    const res = await settingsApi.upsertDesignation({
      id: editing?.id,
      name: form.name.trim(),
      grade: form.grade.trim(),
      departmentIds: form.departmentIds,
      description: form.description.trim() || undefined,
    });
    if (res.error) { showToast(res.error.message, "error"); return; }
    setOpen(false);
    showToast(editing ? "Designation updated" : "Designation added", "success");
    await load();
  };

  const remove = async () => {
    if (!deleteTarget) return;
    await settingsApi.deleteDesignation(deleteTarget.id);
    showToast("Designation deleted", "success");
    await load();
  };

  const columns: ColumnDef<Designation>[] = [
    { key: "name", label: "Designation", sortable: true, render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "grade", label: "Grade / Band" },
    { key: "departmentIds", label: "Department", render: (r) => r.departmentIds.map((id) => depts.find((d) => d.id === id)?.name).filter(Boolean).join(", ") || "—" },
    { key: "employeeCount", label: "Employees", align: "right", sortable: true, render: (r) => r.employeeCount.toLocaleString() },
    { key: "actions", label: "", align: "right", render: (r) => (
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
        <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(r)}>Delete</Button>
      </div>
    ) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-[20px] font-semibold">Designations</h2>
          <p className="text-[13px] text-[#6B6B6B] mt-1">Job titles, grades, and bands.</p>
        </div>
        <Button onClick={openAdd}>+ Add designation</Button>
      </div>
      <DataTable
        columns={columns}
        data={list}
        loading={loading}
        getRowKey={(d) => d.id}
        emptyState={<EmptyState title="No designations yet." subtitle="Add roles your company hires for." action={<Button onClick={openAdd}>Add designation</Button>} />}
      />
      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit designation" : "New designation"}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></>}
      >
        <div className="space-y-5">
          <Input label="Designation name" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Grade / Band" placeholder="L4, Senior, Band 3" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-[#0A0A0A]">Associated departments</p>
            <div className="flex flex-wrap gap-2">
              {depts.map((d) => {
                const checked = form.departmentIds.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setForm({ ...form, departmentIds: checked ? form.departmentIds.filter((x) => x !== d.id) : [...form.departmentIds, d.id] })}
                    className={`text-[13px] rounded-full px-3 py-1 border transition-colors ${checked ? "bg-[#0A0A0A] text-white border-[#0A0A0A]" : "border-[#E5E5E3] hover:bg-[#F2F2F0]"}`}
                  >
                    {d.name}
                  </button>
                );
              })}
            </div>
          </div>
          <Textarea label="Description" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </SlideOver>
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete designation?"
        description={`Delete ${deleteTarget?.name}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={remove}
      />
    </div>
  );
}
