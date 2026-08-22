/** Role-aware ESS home — what an individual contributor sees instead of the HR dashboard. */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Badge, Spinner, StatCard } from "@/lib/components/ui";
import { AnnouncementCard } from "./AnnouncementCard";
import { essApi } from "@/lib/api/ess";
import { leaveApi } from "@/lib/api/leave";
import { payrollApi } from "@/lib/api/payroll";
import { useCurrentEmployee } from "@/lib/hooks/useCurrentEmployee";
import { formatCurrency, relativeTime } from "@/lib/utils/format";
import { monthLabel, type Payslip } from "@/lib/types/payroll";
import type { Announcement, AppNotification } from "@/lib/types/ess";
import type { LeaveBalance } from "@/lib/types/leave";
import { Calendar, DollarSign, Bell, UserCheck, ArrowUpRight, Zap } from "lucide-react";

const QUICK_LINKS: { label: string; to: string; hint: string }[] = [
  { label: "Apply for leave", to: "/leave/apply", hint: "Plan your time off" },
  { label: "Regularise attendance", to: "/attendance/regularization", hint: "Fix a missing punch" },
  { label: "My payslips", to: "/payroll/payslips", hint: "Download pay slips" },
  { label: "Claim an expense", to: "/expenses/new", hint: "Get reimbursed" },
  { label: "Raise a ticket", to: "/helpdesk/new", hint: "IT, HR or payroll help" },
  { label: "My goals", to: "/performance/goals", hint: "Track your OKRs" },
];

export function EmployeeHomeDashboard() {
  const { employee, loading: empLoading } = useCurrentEmployee();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employee) return;
    let alive = true;
    void (async () => {
      const [b, p, n, a] = await Promise.all([
        leaveApi.listBalances(employee.id),
        payrollApi.listPayslips(employee.id),
        essApi.listNotifications(),
        essApi.listAnnouncements(),
      ]);
      if (!alive) return;
      setBalances(b.data ?? []);
      setPayslip(p.data?.[0] ?? null);
      setNotifications(n.data ?? []);
      setAnnouncements(a.data ?? []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [employee?.id]);

  if (empLoading || (employee && loading)) {
    return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
  }

  const totalAvailable = balances.reduce((n, b) => n + (b.available ?? 0), 0);
  const unread = notifications.filter((n) => !n.read);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard label="Leave available" value={`${totalAvailable} days`} icon={<Calendar className="w-4 h-4" />} />
        <StatCard label="Last net pay" value={payslip ? formatCurrency(payslip.netPay) : "—"} icon={<DollarSign className="w-4 h-4" />} />
        <StatCard label="Unread notifications" value={unread.length} icon={<Bell className="w-4 h-4" />} variant={unread.length > 0 ? "dark" : "default"} />
        <StatCard label="Employee code" value={employee?.employeeCode ?? "—"} icon={<UserCheck className="w-4 h-4" />} />
      </div>

      <div className="rounded-2xl border border-[#E5E5E3] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-orange-500" />
          <h2 className="text-[14px] font-bold text-[#0A0A0A] tracking-tight">Quick actions</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {QUICK_LINKS.map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className="group rounded-2xl border border-[#E5E5E3] p-4 hover:border-[#D1D1CF] hover:bg-[#FAFAF9] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[13px] font-bold text-[#0A0A0A] group-hover:text-orange-600 transition-colors">{q.label}</p>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#8E8E8E] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-orange-600" />
                </div>
                <p className="text-[11px] text-[#6B6B6B] mt-1 font-medium">{q.hint}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 sm:gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] font-bold text-[#0A0A0A]">Latest announcements</h2>
              <Link to="/announcements" className="text-[12px] font-semibold text-[#0A0A0A] hover:text-orange-600 flex items-center gap-1">
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {announcements.slice(0, 2).map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5 sm:space-y-6">
          <div className="rounded-2xl border border-[#E5E5E3] bg-white p-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F2F2F0] flex items-center justify-between bg-[#FAFAF9]">
              <h2 className="text-[14px] font-bold text-[#0A0A0A]">Recent notifications</h2>
              <Link to="/notifications" className="text-[12px] text-[#6B6B6B] hover:text-[#0A0A0A]">All</Link>
            </div>
            <ul className="divide-y divide-[#F4F4F2]">
              {notifications.slice(0, 5).map((n) => (
                <li key={n.id} className="px-5 py-3.5 hover:bg-[#FAFAF9] transition-colors">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-[#0A0A0A] truncate">{n.title}</p>
                      <p className="text-[12px] text-[#6B6B6B] line-clamp-2 mt-0.5">{n.body}</p>
                    </div>
                    <span className="text-[11px] text-[#8E8E8E] shrink-0 font-medium">{relativeTime(n.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[#E5E5E3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <h2 className="text-[14px] font-bold text-[#0A0A0A] mb-3">Leave balances</h2>
            <ul className="space-y-2.5">
              {balances.slice(0, 5).map((b) => (
                <li key={b.leaveTypeId} className="flex items-center justify-between text-[13px]">
                  <span className="text-[#0A0A0A] font-medium">{b.leaveType.name}</span>
                  <Badge variant="default">{b.available} left</Badge>
                </li>
              ))}
              {balances.length === 0 && <li className="text-[12px] text-[#6B6B6B]">No leave balances configured yet.</li>}
            </ul>
          </div>

          {payslip && (
            <div className="rounded-2xl border border-[#E5E5E3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <h2 className="text-[14px] font-bold text-[#0A0A0A]">Latest pay slip</h2>
              <p className="text-[12px] text-[#6B6B6B] mt-0.5">{monthLabel(payslip.month, payslip.year)}</p>
              <p className="text-[26px] font-bold text-[#0A0A0A] mt-2 tabular-nums">{formatCurrency(payslip.netPay)}</p>
              <Link to="/payroll/payslips" className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-orange-600 hover:underline">
                Open payslips <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}