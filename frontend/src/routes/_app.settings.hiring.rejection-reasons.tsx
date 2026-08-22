/** Manage the rejection reason library used when rejecting candidates. */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Input,
  RadioGroup,
  SlideOver,
  Toggle,
  showToast,
  type ColumnDef,
} from "@/lib/components/ui";
import { PermissionGuard } from "@/lib/components/rbac";
import { reviewApi } from "@/lib/api/candidates";
import {
  REJECTION_CATEGORY_LABELS,
  type RejectionReason,
  type RejectionReasonCategory,
} from "@/lib/types/candidate";

export const Route = createFileRoute("/_app/settings/hiring/rejection-reasons")({
  component: RejectionReasonsPage,
  head: () => ({
    meta: [
      { title: "Rejection reasons — Hiring settings" },
      { name: "description", content: "Curate the reasons your team can pick from when rejecting a candidate." },
      { property: "og:title", content: "Rejection reasons — Hiring settings" },
      { property: "og:description", content: "Curate the reasons your team can pick from when rejecting a candidate." },
    ],
  }),
});

const CATEGORY_OPTIONS = Object.entries(REJECTION_CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

function RejectionReasonsPage() {
  const [reasons, setReasons] = useState<RejectionReason[]>([]);
  const [editing, setEditing] = useState<RejectionReason | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RejectionReason | null>(null);
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<RejectionReasonCategory>("other");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const load = () => setReasons(reviewApi.rejectionReasons());
  useEffect(() => { load(); }, []);

  const open = (r: RejectionReason | null) => {
    setEditing(r);
    setCreating(r === null);
    setLabel(r?.label ?? "");
    setCategory(r?.category ?? "other");
    setError(undefined);
  };

  const close = () => { setEditing(null); setCreating(false); setError(undefined); };

  const save = async () => {
    setSaving(true);
    const r = await reviewApi.saveRejectionReason({ id: editing?.id, label, category, isActive: editing?.isActive ?? true });
    setSaving(false);
    if (r.error) { setError(r.error.message); return; }
    showToast(editing ? "Reason updated." : "Reason added.", "success");
    close();
    load();
  };

  const toggleActive = async (r: RejectionReason) => {
    await reviewApi.saveRejectionReason({ id: r.id, label: r.label, category: r.category, isActive: !r.isActive });
    load();
  };

  const remove = async (r: RejectionReason) => {
    const res = await reviewApi.deleteRejectionReason(r.id);
    if (res.error) { showToast(res.error.message, "error"); return; }
    showToast("Reason deleted.", "success");
    load();
  };

  const columns: ColumnDef<RejectionReason>[] = useMemo(
    () => [
      { key: "label", label: "Reason", render: (r) => <span className="font-medium">{r.label}</span> },
      { key: "category", label: "Category", render: (r) => <Badge variant="default">{REJECTION_CATEGORY_LABELS[r.category]}</Badge> },
      { key: "usage", label: "Used", render: (r) => `${reviewApi.reasonUsageCount(r.id)} candidate(s)` },
      {
        key: "active",
        label: "Visible",
        render: (r) => (
          <PermissionGuard permission="settings.company.edit" fallback={<span>{r.isActive ? "Yes" : "Hidden"}</span>}>
            <Toggle checked={r.isActive} onChange={() => void toggleActive(r)} label={r.isActive ? "Visible" : "Hidden"} />
          </PermissionGuard>
        ),
      },
      {
        key: "actions",
        label: "",
        align: "right",
        render: (r) => (
          <PermissionGuard permission="settings.company.edit">
            <div className="flex justify-end gap-3">
              <button type="button" className="text-[12px] text-[var(--tenant-primary)] hover:underline" onClick={() => open(r)}>
                Edit
              </button>
              <button type="button" className="text-[12px] text-[#DC2626] hover:underline" onClick={() => setDeleteTarget(r)}>
                Delete
              </button>
            </div>
          </PermissionGuard>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Settings", to: "/settings" }, { label: "Rejection reasons" }]} />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em]">Rejection reasons</h1>
          <p className="text-[14px] text-[#6B6B6B] mt-1">
            These appear when someone rejects a candidate. Hide a reason to retire it without losing history.
          </p>
        </div>
        <PermissionGuard permission="settings.company.edit">
          <Button onClick={() => open(null)}>Add reason</Button>
        </PermissionGuard>
      </div>

      <Card className="p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={reasons}
          getRowKey={(r) => r.id}
          emptyState={<EmptyState title="No rejection reasons yet" subtitle="Add reasons so rejections stay consistent and reportable." />}
        />
      </Card>

      <SlideOver
        open={creating || !!editing}
        onClose={close}
        title={editing ? "Edit reason" : "Add rejection reason"}
        footer={
          <>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button onClick={save} loading={saving}>{editing ? "Save changes" : "Add reason"}</Button>
          </>
        }
      >
        <div className="space-y-5">
          <Input label="Reason" required value={label} onChange={(e) => setLabel(e.target.value)} error={error} placeholder="e.g. Salary expectations too high" />
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-[#0A0A0A]">Category</p>
            <RadioGroup options={CATEGORY_OPTIONS} value={category} onChange={(v) => setCategory(v as RejectionReasonCategory)} />
          </div>
        </div>
      </SlideOver>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete this reason?"
        description={`"${deleteTarget?.label ?? ""}" will no longer be available. Reasons already used on a candidate can't be deleted.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={async () => { if (deleteTarget) await remove(deleteTarget); }}
      />
    </div>
  );
}
