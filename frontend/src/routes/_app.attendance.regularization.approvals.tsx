import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Alert, Button, DataTable, EmptyState, Modal, Spinner, StatCard, Textarea, showToast, type ColumnDef } from "@/lib/components/ui";
import { RegularizationStatusBadge } from "@/lib/components/attendance";
import { PermissionGuard } from "@/lib/components/rbac";
import { attendanceApi } from "@/lib/api/attendance";
import { useCurrentEmployee } from "@/lib/hooks/useCurrentEmployee";
import { REGULARIZATION_TYPE_LABELS, type RegularizationRequest } from "@/lib/types/attendance";
import { CheckSquare, Clock, UserCheck, ShieldAlert, Check, X } from "lucide-react";

export const Route = createFileRoute("/_app/attendance/regularization/approvals")({
  component: ApprovalsPage,
  head: () => ({
    meta: [
      { title: "Regularization Approvals — HRMS" },
      { name: "description", content: "Review and act on pending attendance regularization requests from your team." },
      { property: "og:title", content: "Regularization Approvals — HRMS" },
      { property: "og:description", content: "Review and act on pending attendance regularization requests from your team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ApprovalsPage() {
  return (
    <PermissionGuard
      permission={["attendance.manage", "attendance.view_team"]}
      fallback={<Alert variant="error">You don't have access to regularization approvals.</Alert>}
    >
      <Approvals />
    </PermissionGuard>
  );
}

function Approvals() {
  const { employee, loading: loadingMe } = useCurrentEmployee();
  const [list, setList] = useState<RegularizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<{ req: RegularizationRequest; action: "approved" | "rejected" } | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async (managerId: string) => {
    setLoading(true);
    const res = await attendanceApi.listRegularizations({ managerId, statuses: ["pending"] });
    setList(res.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (employee) void load(employee.id);
  }, [employee?.id]);

  const act = async () => {
    if (!target || !employee) return;
    if (target.action === "rejected" && comment.trim().length === 0) {
      showToast("A comment is required when rejecting.", "error");
      return;
    }
    setBusy(true);
    const res = await attendanceApi.actOnRegularization({
      id: target.req.id,
      action: target.action,
      reviewer: `${employee.firstName} ${employee.lastName}`,
      comment,
    });
    setBusy(false);
    if (res.error) return showToast(res.error.message, "error");
    showToast(target.action === "approved" ? "Request approved" : "Request rejected", "success");
    setTarget(null);
    setComment("");
    void load(employee.id);
  };

  const columns: ColumnDef<RegularizationRequest>[] = [
    {
      key: "employeeName",
      label: "Employee",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#111111] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
            {r.employeeName.charAt(0)}
          </div>
          <div>
            <p className="text-[13px] font-bold text-[#0A0A0A] leading-tight">{r.employeeName}</p>
            <p className="text-[11px] text-[#8E8E8E]">Reportee</p>
          </div>
        </div>
      ),
    },
    {
      key: "date",
      label: "Date",
      render: (r) => <span className="font-bold text-[#0A0A0A] tabular-nums">{r.date}</span>,
    },
    {
      key: "type",
      label: "Correction Type",
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0A0A0A] px-2.5 py-1 rounded-full bg-[#FAFAF9] border border-[#E5E5E3]">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          {REGULARIZATION_TYPE_LABELS[r.type]}
        </span>
      ),
    },
    {
      key: "requestedClockIn",
      label: "Requested Punch Range",
      render: (r) => (
        <span className="tabular-nums font-semibold text-[#0A0A0A] text-[12px] bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
          {r.requestedClockIn ?? "—"} → {r.requestedClockOut ?? "—"}
        </span>
      ),
    },
    {
      key: "reason",
      label: "Reason",
      render: (r) => (
        <span className="text-[12px] text-[#6B6B6B] line-clamp-2 max-w-xs block" title={r.reason}>
          {r.reason}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <RegularizationStatusBadge status={r.status} />,
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setTarget({ req: r, action: "rejected" })}
            className="text-rose-600 border-rose-200 hover:bg-rose-50 gap-1"
          >
            <X className="w-3.5 h-3.5" />
            Reject
          </Button>
          <Button
            size="sm"
            onClick={() => setTarget({ req: r, action: "approved" })}
            className="gap-1 bg-[#0A0A0A] hover:bg-neutral-800 text-white"
          >
            <Check className="w-3.5 h-3.5" />
            Approve
          </Button>
        </div>
      ),
    },
  ];

  if (loadingMe) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Pending Queue"
          value={String(list.length)}
          variant={list.length > 0 ? "dark" : "default"}
          icon={<Clock className="w-4 h-4" />}
          trend={list.length > 0 ? "Action required" : "Queue empty"}
          trendDir={list.length > 0 ? "down" : "up"}
          actionHint
        >
          {list.length > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-ping" />
              <span className="text-[11px] font-medium text-neutral-300">Requires manager review</span>
            </div>
          )}
        </StatCard>

        <StatCard
          label="Average Response Time"
          value="< 24 hrs"
          icon={<UserCheck className="w-4 h-4 text-emerald-600" />}
          trend="SLA compliant"
          trendDir="up"
        />

        <StatCard
          label="Approval Policy"
          value="Manager 1-Step"
          icon={<ShieldAlert className="w-4 h-4 text-orange-500" />}
          trend="Standard rule"
          trendDir="neutral"
        />
      </div>

      {/* Main Approvals Bento Table */}
      <div className="rounded-2xl border border-[#E5E5E3] bg-white shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F2F2F0] flex items-center justify-between bg-[#FAFAF9]">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-orange-500" />
            <h3 className="text-[15px] font-extrabold text-[#0A0A0A] tracking-tight">
              Pending Regularization Queue
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#E5E5E3] text-[#0A0A0A]">
              {list.length}
            </span>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={list}
          loading={loading}
          getRowKey={(r) => r.id}
          emptyState={
            <EmptyState
              title="No pending requests."
              subtitle="Regularization requests from your direct reports will show up here for review."
            />
          }
        />
      </div>

      {/* Modern Bento Decision Modal */}
      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title={target?.action === "approved" ? "Approve Regularization Request" : "Reject Regularization Request"}
        className="max-w-md"
      >
        {target && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#FAFAF9] border border-[#E5E5E3] space-y-2 text-[13px]">
              <div className="flex justify-between items-center pb-2 border-b border-[#E5E5E3]">
                <span className="font-extrabold text-[#0A0A0A]">{target.req.employeeName}</span>
                <span className="font-semibold text-orange-600 text-[11px] px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200">
                  {REGULARIZATION_TYPE_LABELS[target.req.type]}
                </span>
              </div>
              <div className="flex justify-between text-[#6B6B6B]">
                <span>Target Date:</span>
                <span className="font-bold text-[#0A0A0A] tabular-nums">{target.req.date}</span>
              </div>
              <div className="flex justify-between text-[#6B6B6B]">
                <span>Requested Punch Range:</span>
                <span className="font-semibold text-[#0A0A0A] tabular-nums">
                  {target.req.requestedClockIn ?? "—"} to {target.req.requestedClockOut ?? "—"}
                </span>
              </div>
              <div className="pt-2 border-t border-[#E5E5E3]">
                <span className="font-semibold text-[#8E8E8E] text-[10px] uppercase block mb-0.5">Reason</span>
                <p className="text-[#0A0A0A] italic">{target.req.reason}</p>
              </div>
            </div>

            <Textarea
              label={target.action === "rejected" ? "Reason for rejection (required)" : "Review Comment (optional)"}
              placeholder={target.action === "rejected" ? "Provide explanation for rejection..." : "Add optional note..."}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setTarget(null)} disabled={busy}>
                Cancel
              </Button>
              <Button
                variant={target.action === "rejected" ? "danger" : "primary"}
                loading={busy}
                onClick={act}
                className={target.action === "approved" ? "bg-[#0A0A0A] hover:bg-neutral-800 text-white" : ""}
              >
                {target.action === "approved" ? "Approve Request" : "Reject Request"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

