import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/lib/components/layout";
import { Alert, Button, Card, Checkbox, DataTable, EmptyState, Modal, Spinner, Textarea, showToast, type ColumnDef } from "@/lib/components/ui";
import { LeaveStatusBadge, LeaveTypeBadge } from "@/lib/components/leave";
import { leaveApi } from "@/lib/api/leave";
import { listEmployees } from "@/lib/api/employees";
import { authStore } from "@/lib/store/auth";
import { formatRange, overlaps } from "@/lib/utils/workingDays";
import type { Employee } from "@/lib/types/employee";
import type { LeaveRequest } from "@/lib/types/leave";

export const Route = createFileRoute("/_app/leave/approvals")({
  component: ApprovalsPage,
  pendingComponent: () => <div className="flex justify-center py-20"><Spinner size={28} /></div>,
  head: () => ({
    meta: [
      { title: "Leave Approvals — HRMS" },
      { name: "description", content: "Review and act on your team's pending leave requests." },
      { property: "og:title", content: "Leave Approvals — HRMS" },
      { property: "og:description", content: "Review and act on your team's pending leave requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ApprovalsPage() {
  const user = authStore.useSelector((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Employee | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [rejecting, setRejecting] = useState<LeaveRequest | null>(null);
  const [bulkRejecting, setBulkRejecting] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const load = (manager: Employee) => {
    setLoading(true);
    void leaveApi.listRequests({ managerId: manager.id, statuses: ["pending"] }).then((r) => {
      setRequests(r.data ?? []);
      setSelection(new Set());
      setLoading(false);
    });
  };

  useEffect(() => {
    let alive = true;
    void listEmployees().then((emps) => {
      const found = emps.data?.find((e) => e.workEmail === user?.email) ?? emps.data?.[0];
      if (!found || !alive) return;
      setMe(found);
      load(found);
    });
    return () => { alive = false; };
  }, [user?.email]);

  const conflicts = useMemo(() => {
    const map = new Map<string, LeaveRequest[]>();
    for (const r of requests) {
      const overlapping = requests.filter((o) => o.id !== r.id && overlaps(r.startDate, r.endDate, o.startDate, o.endDate));
      if (overlapping.length) map.set(r.id, overlapping);
    }
    return map;
  }, [requests]);

  const approve = async (r: LeaveRequest) => {
    if (!me) return;
    const level = r.twoLevel && r.approvals.some((a) => a.level === "manager" && a.action === "approved") ? "hr_admin" : "manager";
    const res = await leaveApi.actOnRequest({ id: r.id, level, action: "approved", approverId: me.id, approverName: `${me.firstName} ${me.lastName}` });
    if (res.error) { showToast(res.error.message, "error"); return; }
    showToast("Request approved.", "success");
    load(me);
  };

  const doReject = async () => {
    if (!rejecting || !me) return;
    if (!comment.trim()) return;
    setBusy(true);
    const res = await leaveApi.actOnRequest({ id: rejecting.id, level: "manager", action: "rejected", approverId: me.id, approverName: `${me.firstName} ${me.lastName}`, comment: comment.trim() });
    setBusy(false);
    if (res.error) { showToast(res.error.message, "error"); return; }
    showToast("Request rejected.", "info");
    setRejecting(null);
    setComment("");
    load(me);
  };

  const doBulkApprove = async () => {
    if (!me || selection.size === 0) return;
    setBusy(true);
    await leaveApi.bulkAct(Array.from(selection), { level: "manager", action: "approved", approverId: me.id, approverName: `${me.firstName} ${me.lastName}` });
    setBusy(false);
    showToast(`${selection.size} request(s) approved.`, "success");
    load(me);
  };

  const doBulkReject = async () => {
    if (!me || selection.size === 0 || !comment.trim()) return;
    setBusy(true);
    await leaveApi.bulkAct(Array.from(selection), { level: "manager", action: "rejected", approverId: me.id, approverName: `${me.firstName} ${me.lastName}`, comment: comment.trim() });
    setBusy(false);
    showToast(`${selection.size} request(s) rejected.`, "info");
    setBulkRejecting(false);
    setComment("");
    load(me);
  };

  const toggleAll = () => setSelection(selection.size === requests.length ? new Set() : new Set(requests.map((r) => r.id)));
  const toggleOne = (id: string) => setSelection((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const columns: ColumnDef<LeaveRequest>[] = [
    {
      key: "select",
      label: "",
      className: "w-10",
      render: (r) => <Checkbox checked={selection.has(r.id)} onChange={() => toggleOne(r.id)} aria-label={`Select ${r.employeeName}`} />,
    },
    {
      key: "employee",
      label: "Employee",
      render: (r) => (
        <div>
          <p className="font-medium">{r.employeeName}</p>
          {conflicts.has(r.id) && (
            <p className="text-[11px] text-[#B45309] mt-0.5">⚠ Overlaps with {conflicts.get(r.id)!.length} other request(s)</p>
          )}
        </div>
      ),
    },
    { key: "type", label: "Type", render: (r) => <LeaveTypeBadge leaveType={r.leaveType} size="sm" /> },
    { key: "dates", label: "Dates", render: (r) => <span>{formatRange(r.startDate, r.endDate)}</span> },
    { key: "days", label: "Days", render: (r) => <span>{r.workingDays}{r.isHalfDay ? " (half)" : ""}</span> },
    { key: "reason", label: "Reason", render: (r) => <span className="line-clamp-2 max-w-xs block text-[13px] text-[#6B6B6B]">{r.reason || "—"}</span> },
    { key: "status", label: "Status", render: (r) => <LeaveStatusBadge status={r.status} /> },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="tenant" onClick={() => approve(r)}>Approve</Button>
          <Button size="sm" variant="secondary" onClick={() => setRejecting(r)}>Reject</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Leave approvals" description="Review pending requests from your team." />

      {selection.size > 0 && (
        <Alert variant="info" title={`${selection.size} request(s) selected`}>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="tenant" onClick={doBulkApprove} disabled={busy}>Bulk approve</Button>
            <Button size="sm" variant="secondary" onClick={() => setBulkRejecting(true)} disabled={busy}>Bulk reject</Button>
          </div>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={28} /></div>
      ) : requests.length === 0 ? (
        <Card><EmptyState title="No pending approvals" subtitle="You're all caught up — new requests will appear here." /></Card>
      ) : (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Checkbox checked={selection.size === requests.length} onChange={toggleAll} label="Select all" />
          </div>
          <DataTable columns={columns} data={requests} getRowKey={(r) => r.id} />
        </div>
      )}

      <Modal open={!!rejecting} onClose={() => { if (!busy) { setRejecting(null); setComment(""); } }} title="Reject leave request">
        <p className="text-[14px] text-[#6B6B6B] leading-relaxed">A comment is required to reject {rejecting?.employeeName}'s request.</p>
        <div className="mt-4">
          <Textarea label="Comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Explain why this request is being rejected" error={!comment.trim() ? undefined : undefined} />
        </div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => { setRejecting(null); setComment(""); }} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={doReject} loading={busy} disabled={!comment.trim()}>Reject request</Button>
        </div>
      </Modal>

      <Modal open={bulkRejecting} onClose={() => { if (!busy) { setBulkRejecting(false); setComment(""); } }} title="Reject selected requests">
        <p className="text-[14px] text-[#6B6B6B] leading-relaxed">A comment is required to reject {selection.size} request(s).</p>
        <div className="mt-4">
          <Textarea label="Comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Explain why these requests are being rejected" />
        </div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => { setBulkRejecting(false); setComment(""); }} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={doBulkReject} loading={busy} disabled={!comment.trim()}>Reject all</Button>
        </div>
      </Modal>
    </div>
  );
}
