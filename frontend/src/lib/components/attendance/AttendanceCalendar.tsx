/** Month grid of attendance statuses with modern bento day tiles and an obsidian dark detail panel. */
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ATTENDANCE_STATUS_COLORS, ATTENDANCE_STATUS_LABELS, type DailyAttendance } from "@/lib/types/attendance";
import { dateKey, formatClock, formatMinutes } from "@/lib/utils/attendanceChecks";
import { AttendanceStatusBadge } from "./AttendanceStatusBadge";
import { ChevronLeft, ChevronRight, ArrowUpRight, Calendar as CalendarIcon, Clock, Sparkles } from "lucide-react";

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AttendanceCalendar({
  records,
  month,
  year,
  onMonthChange,
}: {
  records: DailyAttendance[];
  month: number;
  year: number;
  onMonthChange: (year: number, month: number) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const byDate = useMemo(() => new Map(records.map((r) => [r.date, r])), [records]);
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const lead = first.getDay();
  const detail = selected ? byDate.get(selected) : undefined;
  const todayKey = dateKey(new Date());

  const monthLabel = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="rounded-3xl border border-[#E5E5E3] bg-white p-6 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Calendar Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-[#F2F2F0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAFAF8] text-[#6B6B6B] border border-[#E5E5E3]">
              <CalendarIcon className="w-3 h-3 text-orange-500" />
              Monthly Timesheet
            </span>
          </div>
          <h2 className="text-[20px] sm:text-[24px] font-extrabold text-[#0A0A0A] tracking-tight font-sans">
            {monthLabel}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => onMonthChange(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1)}
            className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-[#E5E5E3] bg-white text-[#0A0A0A] hover:bg-[#F9F9F7] active:scale-95 transition-all shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => onMonthChange(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1)}
            className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-[#E5E5E3] bg-white text-[#0A0A0A] hover:bg-[#F9F9F7] active:scale-95 transition-all shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Grid Label Header */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
        {WD.map((d) => (
          <div key={d} className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8E8E8E] text-center pb-1">
            {d}
          </div>
        ))}
      </div>

      {/* Month Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {Array.from({ length: lead }).map((_, i) => (
          <div key={`lead-${i}`} className="aspect-square rounded-xl bg-[#FAFAF8]/50 border border-transparent" />
        ))}
        {Array.from({ length: days }).map((_, i) => {
          const d = new Date(year, month, i + 1);
          const key = dateKey(d);
          const rec = byDate.get(key);
          const color = rec ? ATTENDANCE_STATUS_COLORS[rec.status] : ATTENDANCE_STATUS_COLORS.not_marked;
          const isSel = selected === key;
          const isToday = key === todayKey;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(isSel ? null : key)}
              title={rec ? `${ATTENDANCE_STATUS_LABELS[rec.status]} (${rec.date})` : "No record"}
              className={`aspect-square rounded-xl sm:rounded-2xl border text-left p-2 sm:p-2.5 flex flex-col justify-between transition-all duration-200 relative group overflow-hidden ${
                isSel
                  ? "border-[#0A0A0A] bg-[#FAFAF9] shadow-md ring-2 ring-[#0A0A0A]/10 scale-[1.02]"
                  : isToday
                  ? "border-orange-500 bg-orange-50/20 shadow-sm"
                  : "border-[#E5E5E3] bg-white hover:border-[#A3A3A3] hover:bg-[#FAFAF9] hover:shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[12px] sm:text-[13px] font-bold tabular-nums ${isToday ? "text-orange-600 font-extrabold" : "text-[#0A0A0A]"}`}>
                  {i + 1}
                </span>
                {isToday && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-orange-600 bg-orange-100 px-1 rounded">
                    Today
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-auto pt-1 w-full">
                <span
                  aria-hidden
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: color }}
                />
                <span className="text-[10px] font-medium text-[#8E8E8E] truncate hidden sm:inline">
                  {rec ? ATTENDANCE_STATUS_LABELS[rec.status] : "—"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Status Legend Pills */}
      <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-[#F2F2F0]">
        {(Object.keys(ATTENDANCE_STATUS_LABELS) as Array<keyof typeof ATTENDANCE_STATUS_LABELS>).map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FAFAF9] text-[#6B6B6B] border border-[#E5E5E3]"
          >
            <span aria-hidden className="w-2 h-2 rounded-full" style={{ background: ATTENDANCE_STATUS_COLORS[s] }} />
            {ATTENDANCE_STATUS_LABELS[s]}
          </span>
        ))}
      </div>

      {/* Selected Day Obsidian Dark Detail Bento Panel */}
      {detail && (
        <div className="mt-6 rounded-2xl bg-[#111111] text-white p-5 sm:p-6 border border-[#222222] shadow-xl relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#262626]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">Selected Day Details</p>
              <h3 className="text-[16px] sm:text-[18px] font-bold text-white tracking-tight mt-0.5">
                {new Date(`${detail.date}T00:00:00`).toLocaleDateString(undefined, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <AttendanceStatusBadge status={detail.status} />
              <Link
                to="/attendance/regularization"
                className="group inline-flex items-center gap-1 text-xs font-semibold text-neutral-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 rounded-xl transition-all"
              >
                Regularise punch
                <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </div>

          <div className="relative z-10 mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-[13px]">
            <DetailItem label="Clock in" value={formatClock(detail.clockIn)} icon={<Clock className="w-3.5 h-3.5 text-neutral-400" />} />
            <DetailItem label="Clock out" value={formatClock(detail.clockOut)} icon={<Clock className="w-3.5 h-3.5 text-neutral-400" />} />
            <DetailItem label="Hours worked" value={formatMinutes(detail.workedMinutes)} icon={<Sparkles className="w-3.5 h-3.5 text-emerald-400" />} />
            <DetailItem label="Break duration" value={formatMinutes(detail.breakMinutes)} icon={<Sparkles className="w-3.5 h-3.5 text-amber-400" />} />
          </div>

          {detail.note && (
            <div className="relative z-10 mt-4 p-3 rounded-xl bg-white/5 border border-white/10 text-[12px] text-neutral-300">
              <span className="font-semibold text-neutral-400 uppercase text-[10px] tracking-wider block mb-0.5">Note</span>
              {detail.note}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[#1A1A1A] p-3 border border-[#2A2A2A]">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.08em] text-neutral-400 mb-1">
        <span>{label}</span>
        {icon}
      </div>
      <p className="text-[16px] font-bold text-white tabular-nums tracking-tight">{value}</p>
    </div>
  );
}