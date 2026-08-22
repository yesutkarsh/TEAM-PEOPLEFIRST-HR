/** Present/absent/late/on-leave rollup for a team-attendance board. */
import { StatCard } from "@/lib/components/ui";
import type { TeamAttendanceToday } from "@/lib/types/attendance";

export function TeamAttendanceSummary({ rows }: { rows: TeamAttendanceToday[] }) {
  const count = (pred: (r: TeamAttendanceToday) => boolean) => rows.filter(pred).length;
  const present = count((r) => r.status === "present" || r.status === "late" || r.status === "half_day");
  const absent = count((r) => r.status === "absent");
  const late = count((r) => r.status === "late");
  const onLeave = count((r) => r.status === "on_leave");
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <StatCard label="Present" value={present} />
      <StatCard label="Late" value={late} />
      <StatCard label="Absent" value={absent} />
      <StatCard label="On leave" value={onLeave} />
    </div>
  );
}
