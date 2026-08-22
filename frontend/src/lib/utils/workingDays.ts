/** Pure working-day calculations. No browser APIs — safe anywhere. */
import type { TeamLeaveEntry } from "../types/leave";

const DAY_MS = 86_400_000;

export function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function sameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function toKey(d: Date): string {
  const c = startOfDay(d);
  return `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, "0")}-${String(c.getDate()).padStart(2, "0")}`;
}

export function calculateWorkingDays(
  startDate: Date,
  endDate: Date,
  nonWorkingDays: number[],
  holidays: Date[],
  isHalfDay?: boolean,
): number {
  if (!startDate || !endDate) return 0;
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  if (start.getTime() > end.getTime()) return 0;

  const holidaySet = new Set(holidays.map(toKey));
  const nonWorking = new Set(nonWorkingDays);

  if (isHalfDay && start.getTime() === end.getTime()) {
    if (nonWorking.has(start.getDay()) || holidaySet.has(toKey(start))) return 0;
    return 0.5;
  }

  let count = 0;
  for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
    const day = new Date(t);
    if (nonWorking.has(day.getDay())) continue;
    if (holidaySet.has(toKey(day))) continue;
    count += 1;
  }
  return Math.round(count * 2) / 2;
}

export function getDisabledDates(
  nonWorkingDays: number[],
  holidays: Date[],
  existingApprovedLeaves: { startDate: Date; endDate: Date }[],
): Date[] {
  const out: Date[] = [...holidays.map(startOfDay)];
  const nonWorking = new Set(nonWorkingDays);
  for (const leave of existingApprovedLeaves) {
    const start = startOfDay(leave.startDate);
    const end = startOfDay(leave.endDate);
    for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
      const d = new Date(t);
      if (nonWorking.has(d.getDay())) continue;
      out.push(d);
    }
  }
  const seen = new Set<string>();
  return out.filter((d) => {
    const k = toKey(d);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function getTeamLeaveOnDate(date: Date, teamLeaves: TeamLeaveEntry[]): TeamLeaveEntry[] {
  const t = startOfDay(date).getTime();
  return teamLeaves.filter(
    (l) => startOfDay(l.startDate).getTime() <= t && startOfDay(l.endDate).getTime() >= t,
  );
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return startOfDay(aStart).getTime() <= startOfDay(bEnd).getTime()
    && startOfDay(aEnd).getTime() >= startOfDay(bStart).getTime();
}

export function countWeekends(startDate: Date, endDate: Date, nonWorkingDays: number[]): number {
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  if (start.getTime() > end.getTime()) return 0;
  const nonWorking = new Set(nonWorkingDays);
  let n = 0;
  for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
    if (nonWorking.has(new Date(t).getDay())) n += 1;
  }
  return n;
}

export function countHolidaysInRange(startDate: Date, endDate: Date, holidays: Date[], nonWorkingDays: number[]): number {
  const start = startOfDay(startDate).getTime();
  const end = startOfDay(endDate).getTime();
  const nonWorking = new Set(nonWorkingDays);
  return holidays.filter((h) => {
    const d = startOfDay(h);
    return d.getTime() >= start && d.getTime() <= end && !nonWorking.has(d.getDay());
  }).length;
}

export function formatRange(start: Date | null, end: Date | null): string {
  if (!start) return "—";
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  if (!end || sameDay(start, end)) return fmt(start);
  return `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${fmt(end)}`;
}
