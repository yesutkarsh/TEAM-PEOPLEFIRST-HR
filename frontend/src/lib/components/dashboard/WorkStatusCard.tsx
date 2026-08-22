/**
 * Primary "what is my status right now" hero bento surface.
 * Check in / check out is the primary action on the dashboard.
 */
import { useEffect, useMemo, useState } from "react";
import { Button, showToast } from "@/lib/components/ui";
import { attendanceApi } from "@/lib/api/attendance";
import type { AttendanceSettings, DailyAttendance } from "@/lib/types/attendance";
import { formatClock, formatMinutes, getCurrentPosition } from "@/lib/utils/attendanceChecks";
import { Clock, Play, Square, Coffee, CheckCircle2 } from "lucide-react";

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

export function WorkStatusCard({ employeeId, employeeName }: { employeeId: string; employeeName?: string }) {
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
  const state: "out" | "in" | "break" | "done" = !record?.clockIn
    ? "out"
    : record.clockOut
      ? "done"
      : openBreak
        ? "break"
        : "in";

  const ticking = state === "in";
  const now = useNow(ticking);

  const targetMinutes = settings?.fullDayMinutes ?? 480;
  const workedMinutes = useMemo(() => {
    if (!record?.clockIn) return 0;
    if (record.clockOut) return record.workedMinutes;
    const end = state === "break" && openBreak ? new Date(openBreak.start).getTime() : (now ?? Date.now());
    const gross = Math.max(0, Math.round((end - new Date(record.clockIn).getTime()) / 60000));
    return Math.max(0, gross - (record.breakMinutes ?? 0));
  }, [record, now, state, openBreak]);

  const pct = Math.min(100, Math.round((workedMinutes / targetMinutes) * 100));
  const remaining = Math.max(0, targetMinutes - workedMinutes);

  const run = async (
    fn: () => Promise<{ data: DailyAttendance | null; error: { message: string } | null }>,
    success: string,
  ) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.error || !res.data) return showToast(res.error?.message ?? "Something went wrong", "error");
    setRecord(res.data);
    showToast(success, "success");
  };

  const punch = async (kind: "in" | "out") => {
    const location = settings?.enforceGeo ? await getCurrentPosition() : undefined;
    await run(
      () =>
        kind === "in"
          ? attendanceApi.clockIn(employeeId, { location: location ?? undefined })
          : attendanceApi.clockOut(employeeId, { location: location ?? undefined }),
      kind === "in" ? "Checked in. Have a productive day!" : "Checked out. Rest well!",
    );
  };

  const statusLabel =
    state === "out"
      ? "Not Checked In"
      : state === "break"
        ? "On Break"
        : state === "done"
          ? "Shift Completed"
          : "Currently Active";

  const badgeBg =
    state === "in"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : state === "break"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : state === "done"
          ? "bg-neutral-100 text-neutral-600 border-neutral-200"
          : "bg-rose-50 text-rose-700 border-rose-200";

  const dotClass =
    state === "in"
      ? "bg-emerald-500 animate-pulse"
      : state === "break"
        ? "bg-amber-500 animate-bounce"
        : state === "done"
          ? "bg-neutral-400"
          : "bg-rose-500";

  return (
    <div className="relative rounded-3xl border border-[#E5E5E3] bg-white p-6 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Dynamic top bar indicator */}
      <div
        className="absolute inset-x-0 top-0 h-1.5 transition-all duration-300"
        style={{
          background:
            state === "in"
              ? "linear-gradient(90deg, #10B981, #14B8A6)"
              : state === "break"
                ? "linear-gradient(90deg, #F59E0B, #D97706)"
                : state === "done"
                  ? "linear-gradient(90deg, #6B7280, #9CA3AF)"
                  : "linear-gradient(90deg, #F97316, #EA580C)",
        }}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badgeBg}`}>
                <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                {statusLabel}
                {employeeName ? ` · ${employeeName}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-[#8E8E8E]">
              <Clock className="w-3.5 h-3.5" />
              <span>Shift: {formatMinutes(targetMinutes)}</span>
            </div>
          </div>

          <div className="mt-4 flex items-baseline gap-3 flex-wrap">
            <span className="text-[44px] sm:text-[56px] leading-none font-bold tracking-tight text-[#0A0A0A] font-sans tabular-nums">
              {formatMinutes(workedMinutes)}
            </span>
            <span className="text-[15px] sm:text-[17px] font-semibold text-[#8E8E8E] font-sans">
              target: {formatMinutes(targetMinutes)} ({pct}%)
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-2.5 w-full max-w-lg rounded-full bg-[#F4F4F2] overflow-hidden p-0.5 border border-[#EBEBE8]">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-neutral-900 to-neutral-700"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Meta metrics grid */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#F2F2F0]">
            <Meta label="Checked in" value={formatClock(record?.clockIn)} />
            <Meta label="Checked out" value={formatClock(record?.clockOut)} />
            <Meta label="Break taken" value={formatMinutes(record?.breakMinutes ?? 0)} />
            <Meta
              label={state === "done" ? "Overtime logged" : "Remaining time"}
              value={formatMinutes(state === "done" ? (record?.overtimeMinutes ?? 0) : remaining)}
            />
          </div>
        </div>

        {/* Action Controls Side */}
        <div className="flex flex-col justify-center gap-3 lg:w-[220px] lg:border-l lg:border-[#F2F2F0] lg:pl-6">
          {state === "out" && (
            <Button
              variant="tenant"
              size="lg"
              loading={busy}
              className="w-full rounded-2xl py-3.5 text-sm font-semibold shadow-sm hover:shadow transition-all bg-[#0A0A0A] text-white hover:bg-[#222222]"
              onClick={() => void punch("in")}
            >
              <Play className="w-4 h-4 mr-2 inline" />
              Check In Now
            </Button>
          )}

          {(state === "in" || state === "break") && (
            <>
              <Button
                variant="primary"
                size="lg"
                loading={busy}
                className="w-full rounded-2xl py-3 text-sm font-semibold shadow-sm bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => void punch("out")}
              >
                <Square className="w-4 h-4 mr-2 inline" />
                Check Out
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
                  {openBreak ? "Resume Work" : "Take Break"}
                </Button>
              )}
            </>
          )}

          {state === "done" && (
            <div className="rounded-2xl bg-[#F9F9F7] border border-[#E5E5E3] p-4 text-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
              <p className="text-xs font-semibold text-[#0A0A0A]">Shift Complete</p>
              <p className="text-[11px] text-[#6B6B6B] mt-0.5">
                {formatMinutes(record?.workedMinutes ?? 0)} logged today
              </p>
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

