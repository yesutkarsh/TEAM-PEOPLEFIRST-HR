import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Button, Card, DataTable, EmptyState, Input, Select, Textarea, SlideOver, ConfirmDialog, Toggle, Checkbox, Badge, Spinner,
  type ColumnDef,
} from "@/lib/components/ui";
import { showToast } from "@/lib/components/ui/Toast";
import { PermissionGuard } from "@/lib/components/rbac";
import { leaveApi } from "@/lib/api/leave";
import {
  LEAVE_CATEGORY_LABELS, ACCRUAL_LABELS,
  type LeaveType, type LeaveCategory, type AccrualType, type ApplicableGender, type DocumentRequirement,
} from "@/lib/types/leave";

export const Route = createFileRoute("/_app/settings/leave/")({
  component: LeaveTypesPage,
  pendingComponent: () => <div className="flex justify-center py-20"><Spinner size={28} /></div>,
  head: () => ({
    meta: [
      { title: "Leave Types — Settings — HRMS" },
      { name: "description", content: "Configure leave types, accrual, and quotas." },
      { property: "og:title", content: "Leave Types — Settings — HRMS" },
      { property: "og:description", content: "Configure leave types, accrual, and quotas." },
    ],
  }),
});

const CATEGORY_OPTIONS = Object.entries(LEAVE_CATEGORY_LABELS).map(([value, label]) => ({ value, label }));
const ACCRUAL_OPTIONS = Object.entries(ACCRUAL_LABELS).map(([value, label]) => ({ value, label }));
const GENDER_OPTIONS: { value: ApplicableGender; label: string }[] = [
  { value: "all", label: "All" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];
const DOCUMENT_OPTIONS: { value: DocumentRequirement; label: string }[] = [
  { value: "never", label: "Never" },
  { value: "always", label: "Always" },
  { value: "after_n_days", label: "After N days" },
];

interface FormState {
  name: string;
  code: string;
  description: string;
  category: LeaveCategory;
  isPaid: boolean;
  applicableGender: ApplicableGender;
  allowHalfDay: boolean;
  documentRequired: DocumentRequirement;
  documentAfterDays: string;
  minDaysPerRequest: string;
  maxDaysPerRequest: string;
  accrualType: AccrualType;
  annualAllocation: string;
  carryForwardMax: string;
  encashmentAllowed: boolean;
  encashmentMaxDays: string;
  color: string;
  isActive: boolean;
}

function emptyForm(): FormState {
  return {
    name: "", code: "", description: "", category: "earned",
    isPaid: true, applicableGender: "all", allowHalfDay: true, documentRequired: "never",
    documentAfterDays: "", minDaysPerRequest: "0.5", maxDaysPerRequest: "",
    accrualType: "upfront", annualAllocation: "12", carryForwardMax: "", encashmentAllowed: false,
    encashmentMaxDays: "", color: "#2563EB", isActive: true,
  };
}

function toForm(t: LeaveType): FormState {
  return {
    name: t.name, code: t.code, description: t.description ?? "", category: t.category,
    isPaid: t.isPaid, applicableGender: t.applicableGender, allowHalfDay: t.allowHalfDay,
    documentRequired: t.documentRequired, documentAfterDays: t.documentAfterDays ? String(t.documentAfterDays) : "",
    minDaysPerRequest: String(t.minDaysPerRequest), maxDaysPerRequest: t.maxDaysPerRequest ? String(t.maxDaysPerRequest) : "",
    accrualType: t.accrualType, annualAllocation: String(t.annualAllocation),
    carryForwardMax: t.carryForwardMax ? String(t.carryForwardMax) : "",
    encashmentAllowed: t.encashmentAllowed, encashmentMaxDays: t.encashmentMaxDays ? String(t.encashmentMaxDays) : "",
    color: t.color, isActive: t.isActive,
  };
}

function LeaveTypesPage() {
  return (
    <PermissionGuard
      permission="leave.configure"
      fallback={<div className="p-6 text-[14px] text-[#6B6B6B]">You don't have permission to configure leave types.</div>}
    >
      <LeaveTypesInner />
    </PermissionGuard>
  );
}

function LeaveTypesInner() {
  const [list, setList] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<LeaveType | null>(null);

  const load = async () => {
    setLoading(true);
    const r = await leaveApi.listLeaveTypes(true);
    if (r.data) setList(r.data);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };
  const openEdit = (t: LeaveType) => { setEditing(t); setForm(toForm(t)); setOpen(true); };

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      showToast("Name and code are required", "error");
      return;
    }
    const res = await leaveApi.upsertLeaveType({
      id: editing?.id,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || undefined,
      category: form.category,
      isPaid: form.isPaid,
      applicableGender: form.applicableGender,
      allowHalfDay: form.allowHalfDay,
      documentRequired: form.documentRequired,
      documentAfterDays: form.documentRequired === "after_n_days" && form.documentAfterDays ? Number(form.documentAfterDays) : undefined,
      minDaysPerRequest: Number(form.minDaysPerRequest) || 0.5,
      maxDaysPerRequest: form.maxDaysPerRequest ? Number(form.maxDaysPerRequest) : undefined,
      accrualType: form.accrualType,
      annualAllocation: Number(form.annualAllocation) || 0,
      carryForwardMax: form.carryForwardMax ? Number(form.carryForwardMax) : undefined,
      encashmentAllowed: form.encashmentAllowed,
      encashmentMaxDays: form.encashmentAllowed && form.encashmentMaxDays ? Number(form.encashmentMaxDays) : undefined,
      color: form.color,
      isActive: form.isActive,
    });
    if (res.error) { showToast(res.error.message, "error"); return; }
    setOpen(false);
    showToast(editing ? "Leave type updated" : "Leave type added", "success");
    await load();
  };

  const toggleActive = async (t: LeaveType) => {
    await leaveApi.setLeaveTypeActive(t.id, !t.isActive);
    showToast(t.isActive ? "Leave type deactivated" : "Leave type activated", "success");
    await load();
  };

  const remove = async () => {
    if (!deleteTarget) return;
    const res = await leaveApi.deleteLeaveType(deleteTarget.id);
    if (res.error) { showToast(res.error.message, "error"); setDeleteTarget(null); return; }
    showToast("Leave type deleted", "success");
    setDeleteTarget(null);
    await load();
  };

  const columns: ColumnDef<LeaveType>[] = [
    { key: "name", label: "Leave type", sortable: true, render: (t) => (
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
        <span className="font-medium">{t.name}</span>
        <span className="text-[12px] text-[#6B6B6B]">({t.code})</span>
      </div>
    ) },
    { key: "category", label: "Category", render: (t) => LEAVE_CATEGORY_LABELS[t.category] },
    { key: "accrualType", label: "Accrual", render: (t) => ACCRUAL_LABELS[t.accrualType] },
    { key: "annualAllocation", label: "Annual quota", align: "right", render: (t) => t.annualAllocation },
    { key: "isActive", label: "Status", render: (t) => (
      <Badge variant={t.isActive ? "success" : "default"}>{t.isActive ? "Active" : "Inactive"}</Badge>
    ) },
    { key: "actions", label: "", align: "right", render: (t) => (
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(t)}>Edit</Button>
        <Button size="sm" variant="ghost" onClick={() => toggleActive(t)}>{t.isActive ? "Deactivate" : "Activate"}</Button>
        <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(t)}>Delete</Button>
      </div>
    ) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-[20px] font-semibold">Leave types</h2>
          <p className="text-[13px] text-[#6B6B6B] mt-1">Define the leave types available to your organisation.</p>
        </div>
        <Button onClick={openAdd}>+ Add leave type</Button>
      </div>
      <Card className="p-0">
        <DataTable
          columns={columns}
          data={list}
          loading={loading}
          getRowKey={(t) => t.id}
          emptyState={<EmptyState title="No leave types yet." subtitle="Add your first leave type to get started." action={<Button onClick={openAdd}>Add leave type</Button>} />}
        />
      </Card>

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit leave type" : "New leave type"}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></>}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <Textarea label="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" options={CATEGORY_OPTIONS} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as LeaveCategory })} />
            <Select label="Accrual type" options={ACCRUAL_OPTIONS} value={form.accrualType} onChange={(e) => setForm({ ...form, accrualType: e.target.value as AccrualType })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Annual quota (days)" type="number" value={form.annualAllocation} onChange={(e) => setForm({ ...form, annualAllocation: e.target.value })} />
            <Input label="Carry forward max (days)" type="number" value={form.carryForwardMax} onChange={(e) => setForm({ ...form, carryForwardMax: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Min days / request" type="number" step="0.5" value={form.minDaysPerRequest} onChange={(e) => setForm({ ...form, minDaysPerRequest: e.target.value })} />
            <Input label="Max days / request" type="number" step="0.5" value={form.maxDaysPerRequest} onChange={(e) => setForm({ ...form, maxDaysPerRequest: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Applicable gender" options={GENDER_OPTIONS} value={form.applicableGender} onChange={(e) => setForm({ ...form, applicableGender: e.target.value as ApplicableGender })} />
            <Select label="Document required" options={DOCUMENT_OPTIONS} value={form.documentRequired} onChange={(e) => setForm({ ...form, documentRequired: e.target.value as DocumentRequirement })} />
          </div>
          {form.documentRequired === "after_n_days" && (
            <Input label="Document required after (days)" type="number" value={form.documentAfterDays} onChange={(e) => setForm({ ...form, documentAfterDays: e.target.value })} />
          )}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#0A0A0A]">Colour</label>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-16 rounded-md border border-[#E5E5E3] p-1" />
          </div>
          <div className="space-y-3">
            <Checkbox label="Paid leave" checked={form.isPaid} onChange={(e) => setForm({ ...form, isPaid: e.target.checked })} />
            <Checkbox label="Allow half-day requests" checked={form.allowHalfDay} onChange={(e) => setForm({ ...form, allowHalfDay: e.target.checked })} />
            <Checkbox label="Encashable" checked={form.encashmentAllowed} onChange={(e) => setForm({ ...form, encashmentAllowed: e.target.checked })} />
            {form.encashmentAllowed && (
              <Input label="Max encashable days" type="number" value={form.encashmentMaxDays} onChange={(e) => setForm({ ...form, encashmentMaxDays: e.target.value })} />
            )}
          </div>
          <div className="flex items-center justify-between rounded-md border border-[#E5E5E3] px-3 py-2.5">
            <span className="text-[13px] font-medium">Active</span>
            <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
          </div>
        </div>
      </SlideOver>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete leave type?"
        description={`Delete ${deleteTarget?.name}? This cannot be undone. If it is in use, deactivate it instead.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={remove}
      />
    </div>
  );
}
