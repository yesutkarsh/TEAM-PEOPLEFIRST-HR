import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/lib/components/layout";
import { Avatar, DataTable, EmptyState, Spinner, type ColumnDef } from "@/lib/components/ui";
import { AttendanceStatusBadge, DateNav, TeamAttendanceSummary } from "@/lib/components/attendance";
import { AttendanceRiskSection } from "@/lib/components/ai";
import { attendanceApi } from "@/lib/api/attendance";
import { listEmployees } from "@/lib/api/employees";
import { useCurrentEmployee } from "@/lib/hooks/useCurrentEmployee";
import { PermissionGuard } from "@/lib/components/rbac";
import { Alert } from "@/lib/components/ui";
import type { DailyAttendance, TeamAttendanceToday } from "@/lib/types/attendance";
import { dateKey, formatClock, formatMinutes } from "@/lib/utils/attendanceChecks";

export const Route = createFileRoute("/_app/attendance/team")({
  component: TeamAttendancePage,
  pendingComponent: TeamAttendancePending,
  head: () => ({
    meta: [
      { title: "Team Attendance — HRMS" },
      { name: "description", content: "See who is present, late, absent, or on leave across your team for any date." },
      { property: "og:title", content: "Team Attendance — HRMS" },
      { property: "og:description", content: "See who is present, late, absent, or on leave across your team for any date." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function TeamAttendancePending() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 rounded-sm bg-[#F2F2F0] animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-md border border-[#E5E5E3] bg-[#FAFAF8] animate-pulse" />
        ))}
      </div>
      <div className="flex justify-center py-10"><Spinner size={28} /></div>
    </div>
  );
}

function TeamAttendancePage() {
  return (
    <PermissionGuard
      permission="attendance.view_team"
      fallback={<Alert variant="error">You don't have access to team attendance.</Alert>}
    >
      <TeamAttendanceBoard />
    </PermissionGuard>
  );
}

function TeamAttendanceBoard() {
  const { employee, loading: loadingMe } = useCurrentEmployee();
  const [date, setDate] = useState(dateKey(new Date()));
  const [rows, setRows] = useState<TeamAttendanceToday[]>([]);
  const [reportIds, setReportIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employee) return;
    let alive = true;
    void (async () => {
      setLoading(true);
      const emps = (await listEmployees()).data ?? [];
      const reports = emps.filter((e) => e.reportingManagerId === employee.id);
      setReportIds(reports.map((e) => e.id));
      if (!reports.length) {
        if (alive) {
          setRows([]);
          setLoading(false);
        }
        return;
      }
      const recs = (await attendanceApi.listRecords({ employeeIds: reports.map((e) => e.id), from: date, to: date })).data ?? [];
      const byEmp = new Map<string, DailyAttendance>(recs.map((r) => [r.employeeId, r]));
      const board: TeamAttendanceToday[] = reports
        .map((e) => {
          const rec = byEmp.get(e.id);
          return {
            employeeId: e.id,
            employeeName: `${e.firstName} ${e.lastName}`,
            departmentId: e.departmentId,
            avatarUrl: e.avatarUrl,
            status: rec?.status ?? "not_marked",
            clockIn: rec?.clockIn,
            clockOut: rec?.clockOut,
            workedMinutes: rec?.workedMinutes ?? 0,
            lateMinutes: rec?.lateMinutes ?? 0,
          };
        })
        .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
      if (alive) {
        setRows(board);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [employee?.id, date]);

  const columns: ColumnDef<TeamAttendanceToday>[] = [
    {
      key: "employeeName",
      label: "Employee",
      sortable: true,
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.employeeName} src={r.avatarUrl} size={28} />
          <span className="font-medium">{r.employeeName}</span>
        </div>
      ),
    },
    { key: "status", label: "Status", render: (r) => <AttendanceStatusBadge status={r.status} /> },
    { key: "clockIn", label: "Clock in", render: (r) => formatClock(r.clockIn) },
    { key: "clockOut", label: "Clock out", render: (r) => formatClock(r.clockOut) },
    { key: "workedMinutes", label: "Worked", render: (r) => formatMinutes(r.workedMinutes) },
    { key: "lateMinutes", label: "Late by", render: (r) => (r.lateMinutes > 0 ? formatMinutes(r.lateMinutes) : "—") },
  ];

  if (loadingMe) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Team attendance" description="Check in on your direct reports for any working day." />
      <DateNav value={date} onChange={setDate} maxDate={dateKey(new Date())} />
      <TeamAttendanceSummary rows={rows} />
      <AttendanceRiskSection employeeIds={reportIds} />
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        getRowKey={(r) => r.employeeId}
        emptyState={
          <EmptyState
            title="No direct reports found."
            subtitle="Employees reporting to you will show up here with their attendance for the selected day."
          />
        }
      />
    </div>
  );
}
