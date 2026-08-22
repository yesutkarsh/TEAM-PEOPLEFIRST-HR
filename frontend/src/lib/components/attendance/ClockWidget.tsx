/** Primary clock in/out surface with break tracking, shift visualizer, and policy guards. */
import { useEffect, useMemo, useState } from "react";
import { Button, showToast } from "@/lib/components/ui";
import { attendanceApi } from "@/lib/api/attendance";
import type { AttendanceSettings, DailyAttendance } from "@/lib/types/attendance";
import { formatClock, formatMinutes, getCurrentPosition } from "@/lib/utils/attendanceChecks";
import { AttendanceStatusBadge } from "./AttendanceStatusBadge";
import { LiveClock } from "./LiveClock";
import { Play, Square, Coffee, CheckCircle2, ShieldCheck, MapPin, Clock } from "lucide-react";

function useNow(active: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

export function ClockWidget({
  employeeId,
  onChange,
}: {
  employeeId: string;
  onChange?: (record: DailyAttendance) => void;
}) {
  const [record, setRecord] = useState<DailyAttendance | null>(null);
  const [settings, setSettings] = useState<AttendanceSettings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [t, s] = await Promise.all([attendanceApi.getToday(employeeId), attendanceApi.getSettings()]);
      if (!alive) return;
      if (t.data) setRecord(t.data);
      if (s.data) setSettings(s.data);
    })();
    return () => {
      alive = false;
    };
  }, [employeeId]);

  const openBreak = record?.breaks.find((b) => !b.end);
  const state: "not_clocked_in" | "clocked_in" | "on_break" | "clocked_out" = !record?.clockIn
    ? "not_clocked_in"
    : record.clockOut
    ? "clocked_out"
    : openBreak
    ? "on_break"
    : "clocked_in";

  const ticking = state === "clocked_in";
  const now = useNow(ticking);

  const targetMinutes = settings?.fullDayMinutes ?? 480;
  const workedMinutes = useMemo(() => {
    if (!record?.clockIn) return 0;
    if (record.clockOut) return record.workedMinutes;
    const end = state === "on_break" && openBreak ? new Date(openBreak.start).getTime() : (now ?? Date.now());
    const gross = Math.max(0, Math.round((end - new Date(record.clockIn).getTime()) / 60000));
    return Math.max(0, gross - (record.breakMinutes ?? 0));
  }, [record, now, state, openBreak]);

  const pct = Math.min(100, Math.round((workedMinutes / targetMinutes) * 100));
  const remaining = Math.max(0, targetMinutes - workedMinutes);

  const apply = (rec: DailyAttendance) => {
    setRecord(rec);
    onChange?.(rec);
  };

  const run = async (
    fn: () => Promise<{ data: DailyAttendance | null; error: { message: string } | null }>,
    success: string,
  ) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.error || !res.data) return showToast(res.error?.message ?? "Something went wrong", "error");
    apply(res.data);
    showToast(success, "success");
  };

  const punch = async (kind: "in" | "out") => {
    const location = settings?.enforceGeo ? await getCurrentPosition() : undefined;
    await run(
      () =>
        kind === "in"
          ? attendanceApi.clockIn(employeeId, { location: location ?? undefined })
          : attendanceApi.clockOut(employeeId, { location: location ?? undefined }),
      kind === "in" ? "Clocked in. Have a great shift!" : "Clocked out. Enjoy the rest of your day!",
    );
  };

  const statusLabel =
    state === "not_clocked_in"
      ? "Not Clocked In"
      : state === "on_break"
      ? "On Break"
      : state === "clocked_out"
      ? "Shift Completed"
      : "Active Shift";

  const badgeBg =
    state === "clocked_in"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : state === "on_break"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : state === "clocked_out"
      ? "bg-neutral-100 text-neutral-600 border-neutral-200"
      : "bg-rose-50 text-rose-700 border-rose-200";

  const dotClass =
    state === "clocked_in"
      ? "bg-emerald-500 animate-pulse"
      : state === "on_break"
      ? "bg-amber-500 animate-bounce"
      : state === "clocked_out"
      ? "bg-neutral-400"
      : "bg-rose-500";

  return (
    <div className="relative rounded-3xl border border-[#E5E5E3] bg-white p-6 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Top status bar accent */}
      <div
        className="absolute inset-x-0 top-0 h-1.5 transition-all duration-300"
        style={{
          background:
            state === "clocked_in"
              ? "linear-gradient(90deg, #10B981, #14B8A6)"
              : state === "on_break"
              ? "linear-gradient(90deg, #F59E0B, #D97706)"
              : state === "clocked_out"
              ? "linear-gradient(90deg, #6B7280, #9CA3AF)"
              : "linear-gradient(90deg, #F97316, #EA580C)",
        }}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badgeBg}`}>
                <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                {statusLabel}
              </span>
              {record && <AttendanceStatusBadge status={record.status} />}
              {record?.shiftName && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F4F4F2] text-[#0A0A0A] border border-[#E5E5E3]">
                  {record.shiftName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-[11px] font-medium text-[#8E8E8E]">
              <Clock className="w-3.5 h-3.5" />
              <span>Target: {formatMinutes(targetMinutes)}</span>
            </div>
          </div>

          {/* Clock & Worked Time visual readout */}
          <div className="mt-4 flex items-baseline gap-4 flex-wrap">
            <div className="min-w-0">
              <LiveClock />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[34px] sm:text-[44px] leading-none font-bold tracking-tight text-[#0A0A0A] font-sans tabular-nums">
                {formatMinutes(workedMinutes)}
              </span>
              <span className="text-[13px] sm:text-[15px] font-semibold text-[#8E8E8E] font-sans">
                logged ({pct}%)
              </span>
            </div>
          </div>

          {/* Shift progress bar */}
          <div className="mt-4 h-2.5 w-full max-w-xl rounded-full bg-[#F4F4F2] overflow-hidden p-0.5 border border-[#EBEBE8]">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-neutral-900 to-neutral-700"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Meta stats grid */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#F2F2F0]">
            <Meta label="Clocked in" value={formatClock(record?.clockIn)} />
            <Meta label="Clocked out" value={formatClock(record?.clockOut)} />
            <Meta label="Break taken" value={formatMinutes(record?.breakMinutes ?? 0)} />
            <Meta
              label={state === "clocked_out" ? "Overtime" : "Remaining"}
              value={formatMinutes(state === "clocked_out" ? (record?.overtimeMinutes ?? 0) : remaining)}
            />
          </div>
        </div>

        {/* Action Controls Column */}
        <div className="flex flex-col justify-center gap-3 lg:w-[220px] lg:border-l lg:border-[#F2F2F0] lg:pl-6">
          {state === "not_clocked_in" && (
            <Button
              variant="tenant"
              size="lg"
              loading={busy}
              className="w-full rounded-2xl py-3.5 text-sm font-semibold shadow-sm hover:shadow transition-all bg-[#0A0A0A] text-white hover:bg-[#222222]"
              onClick={() => void punch("in")}
            >
              <Play className="w-4 h-4 mr-2 inline" />
              Clock In Now
            </Button>
          )}

          {(state === "clocked_in" || state === "on_break") && (
            <>
              <Button
                variant="primary"
                size="lg"
                loading={busy}
                className="w-full rounded-2xl py-3 text-sm font-semibold shadow-sm bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => void punch("out")}
              >
                <Square className="w-4 h-4 mr-2 inline" />
                Clock Out
              </Button>
              {settings?.breakTrackingEnabled && (
                <Button
                  variant="secondary"
                  size="md"
                  loading={busy}
                  className="w-full rounded-2xl py-2.5 text-xs font-semibold border border-[#E5E5E3] bg-[#F9F9F7] text-[#0A0A0A] hover:bg-[#F2F2F0]"
                  onClick={() =>
                    void run(
                      () => (openBreak ? attendanceApi.endBreak(employeeId) : attendanceApi.startBreak(employeeId)),
                      openBreak ? "Break ended." : "Break started.",
                    )
                  }
                >
                  <Coffee className="w-3.5 h-3.5 mr-1.5 inline" />
                  {openBreak ? "End Break" : "Start Break"}
                </Button>
              )}
            </>
          )}

          {state === "clocked_out" && (
            <div className="rounded-2xl bg-[#F9F9F7] border border-[#E5E5E3] p-4 text-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
              <p className="text-xs font-semibold text-[#0A0A0A]">Shift Completed</p>
              <p className="text-[11px] text-[#6B6B6B] mt-0.5">
                {formatMinutes(record?.workedMinutes ?? 0)} worked today
              </p>
            </div>
          )}

          {/* Location / Security Policy Tags */}
          {(settings?.enforceIp || settings?.enforceGeo) && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {settings.enforceIp && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#FAFAF8] text-[#6B6B6B] border border-[#E5E5E3]">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Office Network
                </span>
              )}
              {settings.enforceGeo && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#FAFAF8] text-[#6B6B6B] border border-[#E5E5E3]">
                  <MapPin className="w-3 h-3 text-orange-500" /> Geo Location Required
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-[#8E8E8E]">{label}</p>
      <p className="text-[14px] font-semibold text-[#0A0A0A] tabular-nums mt-0.5 truncate">{value}</p>
    </div>
  );
}