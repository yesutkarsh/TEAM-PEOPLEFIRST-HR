import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, ArrowUpRight, Filter } from "lucide-react";
import { PageHeader } from "@/lib/components/layout";
import { Button, Card, EmptyState, Modal, SlideOver, Spinner, Textarea, showToast } from "@/lib/components/ui";
import { cn } from "@/lib/utils";
import { LeaveRequestCard, LeaveTimeline } from "@/lib/components/leave";
import { leaveApi } from "@/lib/api/leave";
import { listEmployees } from "@/lib/api/employees";
import { authStore } from "@/lib/store/auth";
import type { LeaveRequest, LeaveRequestStatus } from "@/lib/types/leave";

export const Route = createFileRoute("/_app/leave/requests")({
  component: MyRequestsPage,
  pendingComponent: () => <div className="flex justify-center py-20"><Spinner size={28} /></div>,
  head: () => ({
    meta: [
      { title: "My Leave Requests — HRMS" },
      { name: "description", content: "View, filter and manage your submitted leave requests." },
      { property: "og:title", content: "My Leave Requests — HRMS" },
      { property: "og:description", content: "View, filter and manage your submitted leave requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const FILTERS: { id: string; label: string; statuses?: LeaveRequestStatus[] }[] = [
  { id: "all", label: "All Requests" },
  { id: "pending", label: "Pending", statuses: ["pending"] },
  { id: "approved", label: "Approved", statuses: ["approved", "auto_approved"] },
  { id: "rejected", label: "Rejected", statuses: ["rejected"] },
  { id: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
];

function MyRequestsPage() {
  const user = authStore.useSelector((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const [pendingCancel, setPendingCancel] = useState<LeaveRequest | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const load = (empId: string) => {
    setLoading(true);
    void leaveApi.listRequests({ employeeId: empId }).then((r) => {
      setRequests(r.data ?? []);
      setLoading(false);
    });
  };

  useEffect(() => {
    let alive = true;
    void listEmployees().then((emps) => {
      const me = emps.data?.find((e) => e.workEmail === user?.email) ?? emps.data?.[0];
      if (!me || !alive) return;
      setEmployeeId(me.id);
      load(me.id);
    });
    return () => { alive = false; };
  }, [user?.email]);

  const active = FILTERS.find((f) => f.id === filter);
  const filtered = active?.statuses ? requests.filter((r) => active.statuses!.includes(r.status)) : requests;

  const getCount = (f: typeof FILTERS[number]) => {
    if (!f.statuses) return requests.length;
    return requests.filter((r) => f.statuses!.includes(r.status)).length;
  };

  const doCancel = async () => {
    if (!pendingCancel) return;
    setCancelling(true);
    const res = await leaveApi.cancelRequest(pendingCancel.id, cancelReason.trim() || undefined);
    setCancelling(false);
    if (res.error) { showToast(res.error.message, "error"); return; }
    showToast("Leave request cancelled.", "info");
    setPendingCancel(null);
    setCancelReason("");
    setSelected(null);
    if (employeeId) load(employeeId);
  };

  return (
    <div className="space-y-7 pb-12">
      <PageHeader
        title="My leave requests"
        description="Track the status of your leave requests, or cancel a pending one."
        actions={
          <Link to="/leave/apply">
            <Button variant="primary" className="gap-1.5 font-bold shadow-xs">
              <Plus className="w-4 h-4" />
              Apply for leave
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white" />
            </Button>
          </Link>
        }
      />

      {/* Glass Segmented Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[#FAFAF9] border border-[#E5E5E3]">
        <div className="px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#8E8E8E] flex items-center gap-1.5 shrink-0">
          <Filter className="w-3.5 h-3.5 text-orange-500" />
          Filter:
        </div>
        <div className="flex flex-wrap items-center gap-1.5 flex-1">
          {FILTERS.map((f) => {
            const count = getCount(f);
            const isSelected = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-extrabold transition-all duration-200 active:scale-95",
                  isSelected
                    ? "bg-[#0A0A0A] text-white shadow-2xs"
                    : "bg-white hover:bg-[#F2F2F0] text-[#6B6B6B] border border-[#E5E5E3]",
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-md text-[10px] tabular-nums font-bold",
                    isSelected ? "bg-white/20 text-white" : "bg-[#F4F4F2] text-[#8E8E8E]",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#E5E5E3] bg-white p-8">
          <EmptyState title="No requests found" subtitle="Try a different filter, or apply for leave to get started." />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <LeaveRequestCard
              key={r.id}
              request={r}
              onOpen={() => setSelected(r)}
              onCancel={r.status === "pending" ? () => setPendingCancel(r) : undefined}
            />
          ))}
        </div>
      )}

      <SlideOver
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Request Details"
        description={selected ? `${selected.leaveType.name} · ${selected.workingDays} working day(s)` : undefined}
        footer={
          selected?.status === "pending" ? (
            <Button variant="secondary" className="rounded-xl font-bold" onClick={() => setPendingCancel(selected)}>Cancel request</Button>
          ) : undefined
        }
      >
        {selected && <LeaveTimeline request={selected} />}
      </SlideOver>

      <Modal open={!!pendingCancel} onClose={() => { if (!cancelling) { setPendingCancel(null); setCancelReason(""); } }} title="Cancel this leave request?">
        <p className="text-[14px] text-[#6B6B6B] leading-relaxed">This cannot be undone. You may optionally add a reason for cancellation.</p>
        <div className="mt-4">
          <Textarea label="Reason (optional)" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Why are you cancelling this request?" />
        </div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="secondary" className="rounded-xl font-bold" onClick={() => { setPendingCancel(null); setCancelReason(""); }} disabled={cancelling}>Keep request</Button>
          <Button variant="danger" className="rounded-xl font-bold" onClick={doCancel} loading={cancelling}>Cancel request</Button>
        </div>
      </Modal>
    </div>
  );
}

