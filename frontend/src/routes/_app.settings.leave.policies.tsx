import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Button, Card, DataTable, EmptyState, Input, Textarea, SlideOver, ConfirmDialog, Badge, MultiSelect, Spinner,
  type ColumnDef,
} from "@/lib/components/ui";
import { showToast } from "@/lib/components/ui/Toast";
import { PermissionGuard } from "@/lib/components/rbac";
import { leaveApi } from "@/lib/api/leave";
import { EMPLOYMENT_TYPE_LABELS, type EmploymentType } from "@/lib/types/employee";
import type { LeavePolicy, LeaveType } from "@/lib/types/leave";

export const Route = createFileRoute("/_app/settings/leave/policies")({
  component: LeavePoliciesPage,
  pendingComponent: () => <div className="flex justify-center py-20"><Spinner size={28} /></div>,
  head: () => ({
    meta: [
      { title: "Leave Policies — Settings — HRMS" },
      { name: "description", content: "Configure leave policies and allocations by employment type." },
      { property: "og:title", content: "Leave Policies — Settings — HRMS" },
      { property: "og:description", content: "Configure leave policies and allocations by employment type." },
    ],
  }),
});

const EMPLOYMENT_TYPE_OPTIONS = Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => ({ value, label }));

interface AllocationRow {
  leaveTypeId: string;
  included: boolean;
  daysOverride: string;
}

interface FormState {
  name: string;
  description: string;
  employmentTypes: string[];
  isDefault: boolean;
  allocations: AllocationRow[];
}

function LeavePoliciesPage() {
  return (
    <PermissionGuard
      permission="leave.configure"
      fallback={<div className="p-6 text-[14px] text-[#6B6B6B]">You don't have permission to configure leave policies.</div>}
    >
      <LeavePoliciesInner />
    </PermissionGuard>
  );
}

function LeavePoliciesInner() {
  const [list, setList] = useState<LeavePolicy[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LeavePolicy | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm([]));
  const [deleteTarget, setDeleteTarget] = useState<LeavePolicy | null>(null);

  function emptyForm(allTypes: LeaveType[]): FormState {
    return {
      name: "", description: "", employmentTypes: [], isDefault: false,
      allocations: allTypes.map((t) => ({ leaveTypeId: t.id, included: false, daysOverride: "" })),
    };
  }

  function toForm(p: LeavePolicy, allTypes: LeaveType[]): FormState {
    return {
      name: p.name, description: p.description ?? "",
      employmentTypes: p.eligibility.employmentTypes ?? [], isDefault: p.isDefault,
      allocations: allTypes.map((t) => {
        const a = p.allocations.find((x) => x.leaveTypeId === t.id);
        return { leaveTypeId: t.id, included: !!a, daysOverride: a?.daysOverride != null ? String(a.daysOverride) : "" };
      }),
    };
  }

  const load = async () => {
    setLoading(true);
    const [pr, tr] = await Promise.all([leaveApi.listPolicies(), leaveApi.listLeaveTypes(true)]);
    if (tr.data) setTypes(tr.data);
    if (pr.data) setList(pr.data);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm(types)); setOpen(true); };
  const openEdit = (p: LeavePolicy) => { setEditing(p); setForm(toForm(p, types)); setOpen(true); };

  const toggleAllocation = (leaveTypeId: string, included: boolean) => {
    setForm({ ...form, allocations: form.allocations.map((a) => (a.leaveTypeId === leaveTypeId ? { ...a, included } : a)) });
  };
  const setOverride = (leaveTypeId: string, daysOverride: string) => {
    setForm({ ...form, allocations: form.allocations.map((a) => (a.leaveTypeId === leaveTypeId ? { ...a, daysOverride } : a)) });
  };

  const save = async () => {
    if (!form.name.trim()) { showToast("Policy name is required", "error"); return; }
    const allocations = form.allocations
      .filter((a) => a.included)
      .map((a) => ({ leaveTypeId: a.leaveTypeId, daysOverride: a.daysOverride ? Number(a.daysOverride) : undefined }));
    if (allocations.length === 0) { showToast("Select at least one leave type", "error"); return; }
    const res = await leaveApi.upsertPolicy({
      id: editing?.id,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      allocations,
      eligibility: { employmentTypes: form.employmentTypes.length ? (form.employmentTypes as EmploymentType[]) : undefined },
      isDefault: form.isDefault,
    });
    if (res.error) { showToast(res.error.message, "error"); return; }
    setOpen(false);
    showToast(editing ? "Policy updated" : "Policy added", "success");
    await load();
  };

  const setDefault = async (p: LeavePolicy) => {
    await leaveApi.setDefaultPolicy(p.id);
    showToast(`${p.name} set as default policy`, "success");
    await load();
  };

  const remove = async () => {
    if (!deleteTarget) return;
    const res = await leaveApi.deletePolicy(deleteTarget.id);
    if (res.error) { showToast(res.error.message, "error"); setDeleteTarget(null); return; }
    showToast("Policy deleted", "success");
    setDeleteTarget(null);
    await load();
  };

  const columns: ColumnDef<LeavePolicy>[] = [
    { key: "name", label: "Policy", sortable: true, render: (p) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">{p.name}</span>
        {p.isDefault && <Badge variant="success">Default</Badge>}
      </div>
    ) },
    { key: "allocations", label: "Leave types", render: (p) => p.allocations.map((a) => a.leaveType.code).join(", ") || "—" },
    { key: "eligibility", label: "Eligible for", render: (p) => (p.eligibility.employmentTypes ?? []).map((t) => EMPLOYMENT_TYPE_LABELS[t]).join(", ") || "All" },
    { key: "employeeCount", label: "Employees", align: "right", render: (p) => p.employeeCount.toLocaleString() },
    { key: "actions", label: "", align: "right", render: (p) => (
      <div className="flex justify-end gap-2">
        {!p.isDefault && <Button size="sm" variant="ghost" onClick={() => setDefault(p)}>Set as default</Button>}
        <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>Edit</Button>
        <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(p)}>Delete</Button>
      </div>
    ) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-[20px] font-semibold">Leave policies</h2>
          <p className="text-[13px] text-[#6B6B6B] mt-1">Group leave type allocations and assign them by eligibility.</p>
        </div>
        <Button onClick={openAdd}>+ Add policy</Button>
      </div>
      <Card className="p-0">
        <DataTable
          columns={columns}
          data={list}
          loading={loading}
          getRowKey={(p) => p.id}
          emptyState={<EmptyState title="No leave policies yet." subtitle="Add your first leave policy to assign allocations." action={<Button onClick={openAdd}>Add policy</Button>} />}
        />
      </Card>

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit policy" : "New policy"}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></>}
      >
        <div className="space-y-5">
          <Input label="Policy name" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Textarea label="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <MultiSelect
            label="Eligible employment types"
            options={EMPLOYMENT_TYPE_OPTIONS}
            value={form.employmentTypes}
            onChange={(v) => setForm({ ...form, employmentTypes: v })}
            placeholder="All employment types"
          />
          <div>
            <label className="mb-2 block text-[13px] font-medium text-[#0A0A0A]">Leave type allocations</label>
            <div className="space-y-2 rounded-md border border-[#E5E5E3] p-3">
              {types.map((t) => {
                const row = form.allocations.find((a) => a.leaveTypeId === t.id);
                if (!row) return null;
                return (
                  <div key={t.id} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={row.included}
                      onChange={(e) => toggleAllocation(t.id, e.target.checked)}
                    />
                    <span className="flex-1 text-[13px]">{t.name} <span className="text-[#6B6B6B]">({t.annualAllocation}d default)</span></span>
                    {row.included && (
                      <Input
                        className="w-24"
                        placeholder="Override"
                        type="number"
                        value={row.daysOverride}
                        onChange={(e) => setOverride(t.id, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
              {types.length === 0 && <p className="text-[13px] text-[#6B6B6B]">No leave types available. Add one first.</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="isDefault"
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            />
            <label htmlFor="isDefault" className="text-[13px] font-medium">Set as default policy</label>
          </div>
        </div>
      </SlideOver>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete policy?"
        description={`Delete ${deleteTarget?.name}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={remove}
      />
    </div>
  );
}
