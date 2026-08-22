/** Two-month range calendar with weekend/holiday marking and team-leave dots. */
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { startOfDay, toKey } from "@/lib/utils/workingDays";

export interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  nonWorkingDays?: number[];
  holidays?: { date: Date; name: string }[];
  teamLeaveCounts?: Record<string, number>;
  singleDay?: boolean;
  className?: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthMatrix(view: Date): (Date | null)[] {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const lead = first.getDay();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(new Date(view.getFullYear(), view.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  minDate,
  maxDate,
  disabledDates = [],
  nonWorkingDays = [0, 6],
  holidays = [],
  teamLeaveCounts = {},
  singleDay = false,
  className,
}: DateRangePickerProps) {
  const [view, setView] = useState(() => startOfDay(startDate ?? new Date()));
  const [hover, setHover] = useState<Date | null>(null);

  const disabledSet = useMemo(() => new Set(disabledDates.map(toKey)), [disabledDates]);
  const holidayMap = useMemo(() => {
    const m = new Map<string, string>();
    holidays.forEach((h) => m.set(toKey(h.date), h.name));
    return m;
  }, [holidays]);

  const months = [view, new Date(view.getFullYear(), view.getMonth() + 1, 1)];

  const isDisabled = (d: Date) => {
    if (minDate && d.getTime() < startOfDay(minDate).getTime()) return true;
    if (maxDate && d.getTime() > startOfDay(maxDate).getTime()) return true;
    return disabledSet.has(toKey(d));
  };

  const rangeEnd = endDate ?? (startDate && !singleDay ? hover : null);

  const inRange = (d: Date) => {
    if (!startDate || !rangeEnd) return false;
    const a = Math.min(startDate.getTime(), rangeEnd.getTime());
    const b = Math.max(startDate.getTime(), rangeEnd.getTime());
    return d.getTime() > a && d.getTime() < b;
  };

  const pick = (d: Date) => {
    if (isDisabled(d)) return;
    if (singleDay) return onChange(d, d);
    if (!startDate || (startDate && endDate)) return onChange(d, null);
    if (d.getTime() < startDate.getTime()) return onChange(d, startDate);
    onChange(startDate, d);
  };

  return (
    <div className={cn("rounded-2xl border border-[#E5E5E3] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-5", className)}>
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
          className="h-9 w-9 rounded-xl border border-[#E5E5E3] bg-[#FAFAF9] hover:bg-[#0A0A0A] hover:text-white text-[#0A0A0A] transition-all flex items-center justify-center shadow-2xs active:scale-95 group"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        </button>

        <div className="flex gap-8 text-[14px] font-extrabold text-[#0A0A0A] tracking-tight font-sans">
          {months.map((m) => (
            <span key={m.toISOString()} className="min-w-[140px] text-center">
              {m.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
          ))}
        </div>

        <button
          type="button"
          aria-label="Next month"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
          className="h-9 w-9 rounded-xl border border-[#E5E5E3] bg-[#FAFAF9] hover:bg-[#0A0A0A] hover:text-white text-[#0A0A0A] transition-all flex items-center justify-center shadow-2xs active:scale-95 group"
        >
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Dual Month Grids */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
        {months.map((m) => (
          <div key={m.toISOString()} className="space-y-2">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1 text-center">
              {WEEKDAYS.map((w, i) => (
                <span key={i} className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#8E8E8E] py-1">
                  {w}
                </span>
              ))}
            </div>

            {/* Day Cells Grid */}
            <div className="grid grid-cols-7 gap-1">
              {monthMatrix(m).map((d, i) => {
                if (!d) return <span key={i} className="h-9" />;
                const key = toKey(d);
                const disabled = isDisabled(d);
                const weekend = nonWorkingDays.includes(d.getDay());
                const holiday = holidayMap.get(key);
                const isStart = startDate && d.getTime() === startDate.getTime();
                const isEnd = rangeEnd && d.getTime() === rangeEnd.getTime();
                const mid = inRange(d);
                const teamCount = teamLeaveCounts[key] ?? 0;

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={disabled}
                    title={holiday ? `Holiday: ${holiday}` : teamCount ? `${teamCount} teammate(s) on leave` : undefined}
                    onMouseEnter={() => setHover(d)}
                    onFocus={() => setHover(d)}
                    onClick={() => pick(d)}
                    aria-label={d.toDateString()}
                    aria-pressed={!!(isStart || isEnd)}
                    className={cn(
                      "relative h-9.5 text-[13px] rounded-xl font-bold transition-all duration-150 outline-none flex items-center justify-center select-none",
                      disabled && "text-[#D4D4D8] line-through bg-transparent cursor-not-allowed",
                      !disabled && weekend && !isStart && !isEnd && !mid && "text-[#8E8E8E] bg-[#FAFAF9]/60",
                      !disabled && !weekend && !isStart && !isEnd && !mid && "text-[#0A0A0A] hover:bg-[#F2F2F0] hover:scale-105",
                      holiday && !disabled && !isStart && !isEnd && !mid && "text-amber-700 bg-amber-500/10 border border-amber-500/20 font-extrabold",
                      mid && "bg-orange-500/12 text-orange-950 font-bold rounded-lg",
                      (isStart || isEnd) && "!bg-[#0A0A0A] !text-white font-extrabold shadow-sm scale-105 rounded-xl z-10",
                    )}
                  >
                    {d.getDate()}

                    {/* Team leave indicator dot */}
                    {teamCount > 0 && !isStart && !isEnd && (
                      <span
                        aria-hidden
                        className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-orange-500 shadow-2xs"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend Footer Sub-Tile */}
      <div className="pt-3 border-t border-[#F2F2F0] flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-bold text-[#6B6B6B] bg-[#FAFAF9] rounded-xl p-3 border border-[#E5E5E3]/60">
        <span className="inline-flex items-center gap-1.5 text-[#0A0A0A]">
          <span className="h-2.5 w-2.5 rounded-md bg-[#0A0A0A]" />
          Selected Date
        </span>
        <span className="inline-flex items-center gap-1.5 text-[#0A0A0A]">
          <span className="h-2.5 w-2.5 rounded-md bg-orange-500/20 border border-orange-500/40" />
          Range
        </span>
        <span className="inline-flex items-center gap-1.5 text-amber-700">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          Public Holiday
        </span>
        <span className="inline-flex items-center gap-1.5 text-[#8E8E8E]">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
          Teammate on Leave
        </span>
        <span className="inline-flex items-center gap-1.5 text-[#A1A1AA] line-through">
          Unavailable
        </span>
      </div>
    </div>
  );
}

