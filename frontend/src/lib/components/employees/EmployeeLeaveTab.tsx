/** Leave history + balances shown inside the employee profile. */
import { useEffect, useState } from "react";
import { Calendar, Palmtree } from "lucide-react";
import { Card, EmptyState, Spinner } from "@/lib/components/ui";
import { LeaveBalanceGrid } from "@/lib/components/leave/LeaveBalanceGrid";
import { LeaveStatusBadge } from "@/lib/components/leave/LeaveStatusBadge";
import { leaveApi } from "@/lib/api/leave";
import type { LeaveBalance, LeaveRequest, LeaveType } from "@/lib/types/leave";
import type { Employee } from "@/lib/types/employee";

export function EmployeeLeaveTab({ employee }: { employee: Employee }) {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void Promise.all([
      leaveApi.listBalances(employee.id),
      leaveApi.listRequests({ employeeId: employee.id }),
      leaveApi.listLeaveTypes(),
    ]).then(([b, r, t]) => {
      if (!alive) return;
      setBalances(b.data ?? []);
      setRequests(r.data ?? []);
      setTypes(t.data ?? []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [employee.id]);

  const typeName = (id: string) => types.find((t) => t.id === id)?.name ?? "Leave";

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E5E5E3] bg-white p-12 flex justify-center items-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Leave Balances Container */}
      <div className="rounded-2xl border border-[#E5E5E3] bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Palmtree className="w-4 h-4 text-orange-600" />
          <h3 className="text-[14px] font-bold text-[#0A0A0A] tracking-tight">Leave Entitlements & Balances</h3>
        </div>
        {balances.length ? (
          <LeaveBalanceGrid balances={balances} />
        ) : (
          <p className="text-[13px] text-[#8E8E8E] py-2">No leave balances configured yet.</p>
        )}
      </div>

      {/* Leave History List Widget */}
      <div className="rounded-2xl border border-[#E5E5E3] bg-white shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F2F2F0] flex items-center justify-between bg-[#FAFAF9]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-600" />
            <h3 className="text-[14px] font-bold text-[#0A0A0A] tracking-tight">Leave History</h3>
          </div>
          <span className="text-[11px] font-semibold text-[#8E8E8E] uppercase tracking-wider">
            {requests.length} request{requests.length === 1 ? "" : "s"}
          </span>
        </div>

        {requests.length === 0 ? (
          <div className="p-8">
            <EmptyState title="No leave requests" subtitle="This employee has not applied for leave yet." />
          </div>
        ) : (
          <ul className="divide-y divide-[#F2F2F0]">
            {requests.slice(0, 20).map((r) => (
              <li key={r.id} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-[#FAFAF9] transition-colors">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-bold text-[#0A0A0A] truncate">{typeName(r.leaveTypeId)}</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAFAF9] text-[#404040] border border-[#E5E5E3] tabular-nums">
                      {r.workingDays} day{r.workingDays === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#8E8E8E] font-medium">
                    {new Date(r.startDate).toLocaleDateString()} → {new Date(r.endDate).toLocaleDateString()}
                  </p>
                </div>
                <LeaveStatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

