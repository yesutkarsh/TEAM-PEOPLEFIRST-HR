import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Plus, CalendarDays } from "lucide-react";
import { PageHeader } from "@/lib/components/layout";
import { Button, EmptyState, Spinner, showToast } from "@/lib/components/ui";
import { LeaveBalanceGrid, LeaveRequestCard } from "@/lib/components/leave";
import { leaveApi } from "@/lib/api/leave";
import { listEmployees } from "@/lib/api/employees";
import { authStore } from "@/lib/store/auth";
import type { LeaveBalance, LeaveRequest } from "@/lib/types/leave";

export const Route = createFileRoute("/_app/leave/")({
  component: LeaveDashboard,
  head: () => ({
    meta: [
      { title: "My Leave — HRMS" },
      { name: "description", content: "Track your leave balances, apply for time off, and follow approval progress." },
      { property: "og:title", content: "My Leave — HRMS" },
      { property: "og:description", content: "Track your leave balances, apply for time off, and follow approval progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function LeaveDashboard() {
  const user = authStore.useSelector((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const emps = await listEmployees();
      const me = emps.data?.find((e) => e.workEmail === user?.email) ?? emps.data?.[0];
      if (!me) { if (alive) setLoading(false); return; }
      const [b, r] = await Promise.all([
        leaveApi.listBalances(me.id),
        leaveApi.listRequests({ employeeId: me.id }),
      ]);
      if (!alive) return;
      setBalances(b.data ?? []);
      setRequests(r.data ?? []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user?.email]);

  const cancel = async (id: string) => {
    const res = await leaveApi.cancelRequest(id);
    if (res.error) return showToast(res.error.message, "error");
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "cancelled" } : r)));
    showToast("Leave request cancelled", "info");
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  return (
    <div className="space-y-7 pb-12">
      <PageHeader
        title="My leave"
        description="Balances, requests and approval progress for the current year."
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

      {/* Leave Balances Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#8E8E8E]">
              Leave Balances & Allocations
            </h2>
          </div>
          <span className="text-[11px] font-bold text-[#8E8E8E]">
            {balances.length} Leave Types
          </span>
        </div>

        <LeaveBalanceGrid balances={balances} />
      </div>

      {/* My Requests Bento Container */}
      <div className="rounded-2xl border border-[#E5E5E3] bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="px-5 py-4 border-b border-[#F2F2F0] flex items-center justify-between bg-[#FAFAF9]">
          <div className="flex items-center gap-2.5">
            <CalendarDays className="w-4 h-4 text-orange-500" />
            <div>
              <h2 className="text-[15px] font-bold text-[#0A0A0A] tracking-tight">My Requests</h2>
              <p className="text-[11px] font-medium text-[#8E8E8E]">Recent submissions and status</p>
            </div>
          </div>
          <Link
            to="/leave/requests"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#0A0A0A] hover:text-orange-600 transition-colors group"
          >
            View all
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {requests.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No leave requests yet."
              subtitle="Your submitted leave requests and approval status will appear here."
            />
          </div>
        ) : (
          <div className="p-5 space-y-4 bg-[#FAFAF9]/30">
            {requests.slice(0, 5).map((r) => (
              <LeaveRequestCard
                key={r.id}
                request={r}
                onCancel={r.status === "pending" ? () => void cancel(r.id) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

