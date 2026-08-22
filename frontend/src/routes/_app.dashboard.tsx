import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Breadcrumb } from "@/lib/components/ui";
import {
  HRMetricGrid,
  PendingApprovalsWidget,
  TeamCalendarWidget,
  UpcomingEventsWidget,
  RecentActivityFeed,
  WorkStatusCard,
} from "@/lib/components/dashboard";
import { dashboardApi } from "@/lib/api/dashboard";
import { EmployeeHomeDashboard } from "@/lib/components/ess";
import { useCurrentEmployee } from "@/lib/hooks/useCurrentEmployee";
import { authStore } from "@/lib/store/auth";
import { tenantStore } from "@/lib/store/tenant";
import type { ActivityItem, HRMetrics, LeaveToday, PendingApproval, UpcomingEvent } from "@/lib/types/dashboard";
import { ArrowUpRight, Sparkles, Calendar } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Today — HRMS" },
      { name: "description", content: "Your work status, pending actions and team activity at a glance." },
      { property: "og:title", content: "Today — HRMS" },
      { property: "og:description", content: "Your work status, pending actions and team activity at a glance." },
    ],
  }),
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const ROLE_LABEL: Record<string, string> = {
  hr_admin: "HR Admin",
  super_admin: "Administrator",
  manager: "Manager",
  employee: "Employee",
};

const SHORTCUTS: Record<string, { label: string; to: string }[]> = {
  employee: [
    { label: "Apply for leave", to: "/leave/apply" },
    { label: "Regularise attendance", to: "/attendance/regularization" },
    { label: "My payslips", to: "/payroll/payslips" },
    { label: "Raise a ticket", to: "/helpdesk/new" },
  ],
  manager: [
    { label: "Leave approvals", to: "/leave/approvals" },
    { label: "Team attendance", to: "/attendance/team" },
    { label: "Team performance", to: "/performance/team" },
    { label: "Apply for leave", to: "/leave/apply" },
  ],
  hr_admin: [
    { label: "Add employee", to: "/employees/new" },
    { label: "Leave approvals", to: "/leave/approvals" },
    { label: "Run payroll", to: "/payroll/runs" },
    { label: "Company settings", to: "/settings/company" },
  ],
};

function Dashboard() {
  const user = authStore.useSelector((s) => s.user);
  const tenant = tenantStore.useSelector((s) => s.tenant);
  const { employee } = useCurrentEmployee();
  const [metrics, setMetrics] = useState<HRMetrics | null>(null);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [leave, setLeave] = useState<LeaveToday[]>([]);
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const role = user?.role ?? "employee";
  const isEss = role === "employee";

  useEffect(() => {
    if (isEss) return;
    void Promise.all([
      dashboardApi.getMetrics(),
      dashboardApi.listPendingApprovals(),
      dashboardApi.listLeaveToday(),
      dashboardApi.listUpcomingEvents(),
      dashboardApi.listRecentActivity(),
    ]).then(([m, a, l, e, ac]) => {
      if (m.data) setMetrics(m.data);
      if (a.data) setApprovals(a.data);
      if (l.data) setLeave(l.data);
      if (e.data) setEvents(e.data);
      if (ac.data) setActivity(ac.data);
    });
  }, [isEss]);

  const firstName = user?.fullName.split(" ")[0] ?? "there";
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const shortcuts = SHORTCUTS[role] ?? SHORTCUTS.employee;

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-7 pb-12">
      <Breadcrumb items={[{ label: "Overview" }]} />

      {/* Modern Bento Page Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-800 text-white shadow-md relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-neutral-200 border border-white/15 backdrop-blur-md">
              <Sparkles className="w-3 h-3 text-orange-400" />
              {tenant?.settings.companyName ?? "HR Portal"}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white text-neutral-900 uppercase tracking-wider">
              {ROLE_LABEL[role] ?? role}
            </span>
          </div>

          <h1 className="text-[28px] sm:text-[38px] font-extrabold tracking-tight text-white truncate font-sans">
            {greeting()}, {firstName}.
          </h1>
          <p className="mt-1 text-[13px] sm:text-[14px] text-neutral-400 flex items-center gap-1.5 font-medium">
            <Calendar className="w-3.5 h-3.5" />
            {dateLabel}
          </p>
        </div>

        {/* Quick Action Pills in Header */}
        <div className="relative z-10 flex flex-wrap items-center gap-2">
          {shortcuts.slice(0, 4).map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="group inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md transition-all duration-200 active:scale-95"
            >
              {s.label}
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" />
            </Link>
          ))}
        </div>
      </header>

      {/* Clock In / Attendance Hero Bento Card */}
      {employee && <WorkStatusCard employeeId={employee.id} employeeName={`${employee.firstName} ${employee.lastName}`} />}


      {/* Main Dashboard Content */}
      {isEss ? (
        <EmployeeHomeDashboard />
      ) : (
        <>
          {metrics ? <HRMetricGrid metrics={metrics} /> : <MetricSkeleton />}
          
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 sm:gap-6">
            <div className="lg:col-span-3 space-y-5 sm:space-y-6 min-w-0">
              <PendingApprovalsWidget
                initial={approvals}
                onChange={(next) => {
                  setApprovals(next);
                  setMetrics((m) =>
                    m
                      ? {
                          ...m,
                          pendingApprovals: next.length,
                          pendingApprovalsNote: next.length === 0 ? "All clear" : "Needs your action",
                        }
                      : m,
                  );
                }}
              />
              <RecentActivityFeed items={activity} />
            </div>
            
            <div className="lg:col-span-2 space-y-5 sm:space-y-6 min-w-0">
              <TeamCalendarWidget items={leave} />
              <UpcomingEventsWidget items={events} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[124px] rounded-2xl bg-[#F2F2F0] animate-pulse" />
      ))}
    </div>
  );
}
