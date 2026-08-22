/** Settings — Salary Structures CRUD with live CTC preview. */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button, ConfirmDialog, EmptyState, Input, SlideOver, Spinner, Textarea, showToast } from "@/lib/components/ui";
import { PermissionGuard } from "@/lib/components/rbac";
import { CtcCalculator, SalaryStructureCard } from "@/lib/components/payroll";
import { payrollApi } from "@/lib/api/payroll";
import type { SalaryStructure } from "@/lib/types/payroll";

export const Route = createFileRoute("/_app/settings/payroll/structures")({
  component: SalaryStructuresPage,
  pendingComponent: () => <div className="flex justify-center py-20"><Spinner size={28} /></div>,
  head: () => ({
    meta: [
      { title: "Salary Structures — Settings — HRMS" },
      { name: "description", content: "Build and manage salary structures assigned to employees." },
      { property: "og:title", content: "Salary Structures — Settings — HRMS" },
      { property: "og:description", content: "Build and manage salary structures assigned to employees." },
    ],
  }),
});

function SalaryStructuresPage() {
  return (
    <PermissionGuard
      permission="payroll.configure"
      fallback={<div className="p-6 text-[14px] text-[#6B6B6B]">You don't have permission to configure payroll.</div>}
    >
      <SalaryStructuresInner />
    </PermissionGuard>
  );
}

function SalaryStructuresInner() {
  const [list, setList] = useState<SalaryStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SalaryStructure | null>(null);
  const [previewCtc, setPreviewCtc] = useState<number | null>(1200000);

  const load = async () => {
    setLoading(true);
    const res = await payrollApi.listStructures();
    if (res.data) setList(res.data);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const previewStructure = useMemo(() => list.find((s) => s.isDefault) ?? list[0], [list]);

  const openCreate = () => { setName(""); setDescription(""); setCreateOpen(true); };

  const create = async () => {
    if (!name.trim()) { showToast("Structure name is required.", "error"); return; }
    setSaving(true);
    const res = await payrollApi.saveStructure({ name: name.trim(), description: description.trim() || undefined });
    setSaving(false);
    if (res.error) { showToast(res.error.message, "error"); return; }
    showToast("Salary structure created.", "success");
    setCreateOpen(false);
    await load();
  };

  const clone = async (s: SalaryStructure) => {
    const res = await payrollApi.cloneStructure(s.id);
    if (res.error) { showToast(res.error.message, "error"); return; }
    showToast("Salary structure cloned.", "success");
    await load();
  };

  const setDefault = async (s: SalaryStructure) => {
    const res = await payrollApi.setDefaultStructure(s.id);
    if (res.error) { showToast(res.error.message, "error"); return; }
    showToast(`${s.name} set as default structure.`, "success");
    await load();
  };

  const remove = async () => {
    if (!deleteTarget) return;
    const res = await payrollApi.deleteStructure(deleteTarget.id);
    if (res.error) { showToast(res.error.message, "error"); setDeleteTarget(null); return; }
    showToast("Salary structure deleted.", "success");
    setDeleteTarget(null);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-[20px] font-semibold">Salary structures</h2>
          <p className="text-[13px] text-[#6B6B6B] mt-1">Structures combine salary components and are assigned to employees.</p>
        </div>
        <Button onClick={openCreate}>+ Add structure</Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => <div key={i} className="h-[110px] rounded-md border border-[#E5E5E3] bg-white animate-pulse" />)}
            </div>
          ) : list.length === 0 ? (
            <EmptyState title="No salary structures yet" subtitle="Add your first salary structure to start assigning it to employees." action={<Button onClick={openCreate}>Add structure</Button>} />
          ) : (
            list.map((s) => (
              <SalaryStructureCard
                key={s.id}
                structure={s}
                canManage
                onClone={() => clone(s)}
                onSetDefault={() => setDefault(s)}
                onDelete={() => setDeleteTarget(s)}
              />
            ))
          )}
        </div>

        {previewStructure && (
          <CtcCalculator structure={previewStructure} annualCtc={previewCtc} onCtcChange={setPreviewCtc} />
        )}
      </div>

      <SlideOver
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New salary structure"
        description="Add components once the structure is created."
        footer={<><Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button><Button onClick={create} loading={saving}>Create structure</Button></>}
      >
        <div className="space-y-4">
          <Input label="Structure name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea label="Description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </SlideOver>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete salary structure?"
        description={`Delete ${deleteTarget?.name}? This cannot be undone. If employees are assigned to it, reassign them first.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={remove}
      />
    </div>
  );
}
