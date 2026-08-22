/** Attendance summary + recent records shown inside the employee profile. */
import { useEffect, useState } from "react";
import { Clock, Calendar } from "lucide-react";
import { Card, EmptyState, Spinner } from "@/lib/components/ui";
import { AttendanceStatusBadge } from "@/lib/components/attendance/AttendanceStatusBadge";
import { attendanceApi } from "@/lib/api/attendance";
import type { DailyAttendance } from "@/lib/types/attendance";
import type { Employee } from "@/lib/types/employee";

function iso(d: Date) { return d.toISOString().slice(0, 10); }

export function EmployeeAttendanceTab({ employee }: { employee: Employee }) {
  const [records, setRecords] = useState<DailyAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const to = new Date();
    const from = new Date(); from.setDate(from.getDate() - 29);
    void attendanceApi.listRecords({ employeeId: employee.id, from: iso(from), to: iso(to) }).then((res) => {
      if (!alive) return;
      setRecords([...(res.data ?? [])].sort((a, b) => b.date.localeCompare(a.date)));
      setLoading(false);
    });
    return () => { alive = false; };
  }, [employee.id]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E5E5E3] bg-white p-12 flex justify-center items-center">
        <Spinner />
      </div>
    );
  }

  const count = (s: string) => records.filter((r) => r.status === s).length;
  const stats: Array<{ label: string; value: number; color: string }> = [
    { label: "Present", value: count("present"), color: "border-l-emerald-500 text-emerald-600" },
    { label: "Late", value: count("late"), color: "border-l-amber-500 text-amber-600" },
    { label: "Absent", value: count("absent"), color: "border-l-rose-500 text-rose-600" },
    { label: "On leave", value: count("on_leave"), color: "border-l-orange-500 text-orange-600" },
  ];

  return (
    <div className="space-y-5">
      {/* Stat Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8E8E8E]">
            Attendance Summary (Last 30 Days)
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-[#E5E5E3] bg-white p-4 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8E8E8E] mb-1">
                {s.label}
              </p>
              <p className="text-[32px] sm:text-[40px] leading-none font-bold tracking-tight text-[#0A0A0A] tabular-nums">
                {s.value}
              </p>
              <div className={`mt-3 h-1 w-full rounded-full bg-neutral-100 overflow-hidden`}>
                <div
                  className={`h-full ${s.color.includes("emerald") ? "bg-emerald-500" : s.color.includes("amber") ? "bg-amber-500" : s.color.includes("rose") ? "bg-rose-500" : "bg-orange-500"}`}
                  style={{ width: `${Math.min(100, (s.value / (records.length || 1)) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Records List Widget */}
      <div className="rounded-2xl border border-[#E5E5E3] bg-white shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F2F2F0] flex items-center justify-between bg-[#FAFAF9]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-600" />
            <h3 className="text-[14px] font-bold text-[#0A0A0A] tracking-tight">Recent Attendance Records</h3>
          </div>
          <span className="text-[11px] font-semibold text-[#8E8E8E] uppercase tracking-wider">
            Showing last {Math.min(15, records.length)} entries
          </span>
        </div>

        {records.length === 0 ? (
          <div className="p-8">
            <EmptyState title="No attendance records" subtitle="Nothing recorded for this employee in the last 30 days." />
          </div>
        ) : (
          <ul className="divide-y divide-[#F2F2F0]">
            {records.slice(0, 15).map((r) => (
              <li key={r.id ?? r.date} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-[#FAFAF9] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#FAFAF9] border border-[#F2F2F0] text-neutral-600">
                    <Clock className="w-4 h-4 text-neutral-500" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#0A0A0A]">{r.date}</p>
                    <p className="text-[12px] text-[#8E8E8E] font-medium">
                      Clock-in: {r.clockIn ? new Date(r.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"} ·
                      Clock-out: {r.clockOut ? new Date(r.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </p>
                  </div>
                </div>
                <AttendanceStatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

