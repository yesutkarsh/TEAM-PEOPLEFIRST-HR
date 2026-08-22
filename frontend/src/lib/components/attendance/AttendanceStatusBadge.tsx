import { ATTENDANCE_STATUS_COLORS, ATTENDANCE_STATUS_LABELS, type AttendanceStatus } from "@/lib/types/attendance";
import { cn } from "@/lib/utils";

export function AttendanceStatusBadge({ status, className }: { status: AttendanceStatus; className?: string }) {
  const color = ATTENDANCE_STATUS_COLORS[status];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium", className)}
      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
    >
      <span aria-hidden className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {ATTENDANCE_STATUS_LABELS[status]}
    </span>
  );
}