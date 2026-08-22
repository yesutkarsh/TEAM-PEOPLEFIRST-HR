import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Breadcrumb, Spinner, StatCard } from "@/lib/components/ui";
import { AttendanceCalendar, ClockWidget } from "@/lib/components/attendance";
import { attendanceApi } from "@/lib/api/attendance";
import { useCurrentEmployee } from "@/lib/hooks/useCurrentEmployee";
import type { AttendanceSummary, DailyAttendance } from "@/lib/types/attendance";
import { formatMinutes, pad2 } from "@/lib/utils/attendanceChecks";
import { ArrowUpRight, Sparkles, Calendar, Clock, UserCheck, Timer, Award } from "lucide-react";

export const Route = createFileRoute("/_app/attendance/")({
  component: MyAttendance,
  head: () => ({
    meta: [
      { title: "My Attendance — HRMS" },
      { name: "description", content: "Clock in and out, track breaks, and review your monthly attendance record." },
      { property: "og:title", content: "My Attendance — HRMS" },
      { property: "og:description", content: "Clock in and out, track breaks, and review your monthly attendance record." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function MyAttendance() {
  const { employee, loading } = useCurrentEmployee();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [records, setRecords] = useState<DailyAttendance[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);

  const load = async (empId: string, y: number, m: number) => {
    await attendanceApi.syncLeave(empId);
    const from = `${y}-${pad2(m + 1)}-01`;
    const to = `${y}-${pad2(m + 1)}-${pad2(new Date(y, m + 1, 0).getDate())}`;
    const [recs, sum] = await Promise.all([
      attendanceApi.getMonth(empId, y, m),
      attendanceApi.getSummary(empId, from, to),
    ]);
    setRecords(recs.data ?? []);
    setSummary(sum.data);
  };

  useEffect(() => {
    if (!employee) return;
    void load(employee.id, year, month);
  }, [employee?.id, year, month]);

  if (loading || !employee) {
    return (
      <div className="flex justify-center items-center py-32">
        <Spinner size={32} />
      </div>
    );
  }

  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-7 pb-12">
      <Breadcrumb items={[{ label: "Overview", to: "/dashboard" }, { label: "My Attendance" }]} />

      {/* Modern Bento Page Header Banner */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-800 text-white shadow-md relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 min-w-0">
          <h1 className="text-[28px] sm:text-[38px] font-extrabold tracking-tight text-white font-sans">
            My Attendance
          </h1>
          <p className="mt-1 text-[13px] sm:text-[14px] text-neutral-400 flex items-center gap-1.5 font-medium">
            {dateLabel} · Track shifts, breaks & monthly timesheets
          </p>
        </div>

        {/* Quick Action Glass Pills */}
        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <Link
            to="/attendance/regularization"
            className="group inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md transition-all duration-200 active:scale-95"
          >
            Regularise punch
            <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" />
          </Link>
          <Link
            to="/leave/apply"
            className="group inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md transition-all duration-200 active:scale-95"
          >
            Apply for leave
            <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" />
          </Link>
          <Link
            to="/attendance/team"
            className="group inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md transition-all duration-200 active:scale-95"
          >
            Team attendance
            <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" />
          </Link>
        </div>
      </header>

      {/* Hero Clock Widget Surface */}
      <ClockWidget employeeId={employee.id} onChange={() => void load(employee.id, year, month)} />

      {/* KPI Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Attendance Rate"
          value={`${summary?.attendancePct ?? 0}%`}
          variant="dark"
          icon={<UserCheck className="w-4 h-4" />}
          trend={summary?.attendancePct && summary.attendancePct >= 90 ? "Target met" : "Attention needed"}
          trendDir={summary?.attendancePct && summary.attendancePct >= 90 ? "up" : "down"}
          actionHint
        >
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium text-neutral-300">Monthly cumulative score</span>
          </div>
        </StatCard>

        <StatCard
          label="Present Days"
          value={String((summary?.present ?? 0) + (summary?.late ?? 0))}
          icon={<Calendar className="w-4 h-4" />}
          trend={`${summary?.late ?? 0} late`}
          trendDir={summary?.late ? "neutral" : "up"}
        />

        <StatCard
          label="Avg Hours / Day"
          value={formatMinutes(summary?.avgWorkedMinutes ?? 0)}
          icon={<Timer className="w-4 h-4" />}
          trend="8h target"
          trendDir="neutral"
        />

        <StatCard
          label="Overtime Logged"
          value={formatMinutes(summary?.overtimeMinutes ?? 0)}
          icon={<Award className="w-4 h-4" />}
          trend={(summary?.overtimeMinutes ?? 0) > 0 ? "Extra hours" : "Standard"}
          trendDir={(summary?.overtimeMinutes ?? 0) > 0 ? "up" : "neutral"}
        />
      </div>

      {/* Modern Bento Interactive Attendance Calendar */}
      <AttendanceCalendar
        records={records}
        year={year}
        month={month}
        onMonthChange={(y, m) => {
          setYear(y);
          setMonth(m);
        }}
      />
    </div>
  );
}