import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/lib/components/layout";
import { Avatar, Card, EmptyState, Select, Spinner } from "@/lib/components/ui";
import { LeaveTypeBadge } from "@/lib/components/leave";
import { leaveApi } from "@/lib/api/leave";
import { settingsApi, type Department } from "@/lib/api/settings";
import { toKey } from "@/lib/utils/workingDays";
import type { TeamLeaveEntry } from "@/lib/types/leave";

export const Route = createFileRoute("/_app/leave/calendar")({
  component: TeamCalendarPage,
  pendingComponent: () => <div className="flex justify-center py-20"><Spinner size={28} /></div>,
  head: () => ({
    meta: [
      { title: "Team Leave Calendar — HRMS" },
      { name: "description", content: "See who is out this month across your team, with holidays marked." },
      { property: "og:title", content: "Team Leave Calendar — HRMS" },
      { property: "og:description", content: "See who is out this month across your team, with holidays marked." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function monthMatrix(view: Date): (Date | null)[] {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const lead = first.getDay();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(new Date(view.getFullYear(), view.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function TeamCalendarPage() {
  const [view, setView] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<TeamLeaveEntry[]>([]);
  const [holidays, setHolidays] = useState<Date[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState("");

  useEffect(() => { void settingsApi.listDepartments().then((r) => r.data && setDepartments(r.data)); }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const from = new Date(view.getFullYear(), view.getMonth(), 1);
    const to = new Date(view.getFullYear(), view.getMonth() + 1, 0);
    void Promise.all([
      leaveApi.listTeamLeaves(from, to, { departmentId: departmentId || undefined }),
      leaveApi.getCalendarContext(),
    ]).then(([res, cal]) => {
      if (!alive) return;
      setEntries(res.data ?? []);
      setHolidays(cal.holidays);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [view, departmentId]);

  const byDay = useMemo(() => {
    const map = new Map<string, TeamLeaveEntry[]>();
    for (const e of entries) {
      const start = new Date(e.startDate);
      const end = new Date(e.endDate);
      for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
        const key = toKey(new Date(t));
        const list = map.get(key) ?? [];
        list.push(e);
        map.set(key, list);
      }
    }
    return map;
  }, [entries]);

  const holidaySet = useMemo(() => new Set(holidays.map(toKey)), [holidays]);
  const cells = monthMatrix(view);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team leave calendar"
        description="See who is out this month, with company holidays marked."
        actions={
          <Select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            placeholder="All departments"
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            className="w-56"
          />
        }
      />

      <Card padded={false} className="p-4">
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} className="h-8 w-8 rounded-sm border border-[#E5E5E3] text-[#6B6B6B] hover:bg-[#F2F2F0]">‹</button>
          <p className="text-[15px] font-semibold">{view.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
          <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} className="h-8 w-8 rounded-sm border border-[#E5E5E3] text-[#6B6B6B] hover:bg-[#F2F2F0]">›</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={24} /></div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF] py-1">{w}</div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="min-h-[100px]" />;
              const key = toKey(d);
              const dayEntries = byDay.get(key) ?? [];
              const isHoliday = holidaySet.has(key);
              return (
                <div key={i} className={`min-h-[100px] rounded-sm border p-1.5 ${isHoliday ? "bg-[#FFFBEB] border-[#FDE68A]" : "border-[#F2F2F0]"}`}>
                  <p className={`text-[12px] font-medium ${isHoliday ? "text-[#B45309]" : "text-[#0A0A0A]"}`}>{d.getDate()}</p>
                  <div className="mt-1 space-y-0.5">
                    {dayEntries.slice(0, 3).map((e, idx) => (
                      <div key={idx} className="flex items-center gap-1" title={`${e.employeeName} — ${e.leaveType.name}`}>
                        <Avatar name={e.employeeName} size={14} />
                        <span className="text-[10px] truncate text-[#4B4B4B]">{e.employeeName.split(" ")[0]}</span>
                      </div>
                    ))}
                    {dayEntries.length > 3 && <p className="text-[10px] text-[#9CA3AF]">+{dayEntries.length - 3} more</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <p className="text-[13px] font-semibold mb-3">Who's out this month</p>
        {entries.length === 0 ? (
          <EmptyState title="No one is on leave this month." />
        ) : (
          <ul className="space-y-2">
            {entries.map((e, i) => (
              <li key={i} className="flex items-center gap-3 text-[13px]">
                <Avatar name={e.employeeName} size={24} />
                <span className="font-medium">{e.employeeName}</span>
                <LeaveTypeBadge leaveType={e.leaveType} size="sm" />
                <span className="text-[#6B6B6B]">{e.startDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – {e.endDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
