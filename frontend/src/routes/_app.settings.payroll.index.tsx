/** Settings — Salary Components CRUD. */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button, ConfirmDialog, EmptyState, Spinner, showToast } from "@/lib/components/ui";
import { PermissionGuard } from "@/lib/components/rbac";
import { SalaryComponentForm, SalaryComponentRow } from "@/lib/components/payroll";
import { payrollApi } from "@/lib/api/payroll";
import type { SalaryComponent } from "@/lib/types/payroll";

export const Route = createFileRoute("/_app/settings/payroll/")({
  component: SalaryComponentsPage,
  pendingComponent: () => <div className="flex justify-center py-20"><Spinner size={28} /></div>,
  head: () => ({
    meta: [
      { title: "Salary Components — Settings — HRMS" },
      { name: "description", content: "Configure the earnings, deductions, and employer contributions used to build salary structures." },
      { property: "og:title", content: "Salary Components — Settings — HRMS" },
      { property: "og:description", content: "Configure the earnings, deductions, and employer contributions used to build salary structures." },
    ],
  }),
});

function SalaryComponentsPage() {
  return (
    <PermissionGuard
      permission="payroll.configure"
      fallback={<div className="p-6 text-[14px] text-[#6B6B6B]">You don't have permission to configure payroll.</div>}
    >
      <SalaryComponentsInner />
    </PermissionGuard>
  );
}

function SalaryComponentsInner() {
  const [list, setList] = useState<SalaryComponent[]>([]);
  const [structures, setStructures] = useState<{ componentId: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SalaryComponent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SalaryComponent | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [componentsRes, structuresRes] = await Promise.all([
      payrollApi.listComponents(),
      payrollApi.listStructures(),
    ]);
    if (componentsRes.data) setList(componentsRes.data);
    setStructures((structuresRes.data ?? []).flatMap((s) => s.components));
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const usedIds = new Set(structures.map((c) => c.componentId));

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (c: SalaryComponent) => { setEditing(c); setFormOpen(true); };

  const toggleActive = async (c: SalaryComponent) => {
    const res = await payrollApi.saveComponent({ ...c, isActive: !c.isActive });
    if (res.error) { showToast(res.error.message, "error"); return; }
    showToast(c.isActive ? "Component deactivated." : "Component activated.", "success");
    await load();
  };

  const remove = async () => {
    if (!deleteTarget) return;
    const res = await payrollApi.deleteComponent(deleteTarget.id);
    if (res.error) { showToast(res.error.message, "error"); setDeleteTarget(null); return; }
    showToast("Component deleted.", "success");
    setDeleteTarget(null);
    await load();
  };

  const onDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId) { setDragId(null); return; }
    const ids = list.map((c) => c.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(to, 0, ...ids.splice(from, 1));
    setDragId(null);
    const res = await payrollApi.reorderComponents(ids);
    if (res.data) setList(res.data.sort((a, b) => a.displayOrder - b.displayOrder));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-[20px] font-semibold">Salary components</h2>
          <p className="text-[13px] text-[#6B6B6B] mt-1">The earnings, deductions, and employer contributions available to salary structures.</p>
        </div>
        <Button onClick={openAdd}>+ Add component</Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-[56px] rounded-md border border-[#E5E5E3] bg-white animate-pulse" />)}
        </div>
      ) : list.length === 0 ? (
        <EmptyState title="No salary components yet" subtitle="Add your first salary component to start building structures." action={<Button onClick={openAdd}>Add component</Button>} />
      ) : (
        <div className="rounded-md border border-[#E5E5E3] bg-white">
          {list.map((c) => (
            <SalaryComponentRow
              key={c.id}
              component={c}
              canManage
              onEdit={() => openEdit(c)}
              onToggleActive={() => toggleActive(c)}
              onDelete={() => setDeleteTarget(c)}
              onDragStart={() => setDragId(c.id)}
              onDrop={() => onDrop(c.id)}
            />
          ))}
        </div>
      )}

      <SalaryComponentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        component={editing}
        usedInStructure={!!editing && usedIds.has(editing.id)}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete salary component?"
        description={`Delete ${deleteTarget?.name}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={remove}
      />
    </div>
  );
}
