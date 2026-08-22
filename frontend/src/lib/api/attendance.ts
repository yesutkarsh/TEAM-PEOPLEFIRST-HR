/**
 * Attendance & time-tracking mock API. Browser-storage backed, no backend.
 * Records are stored per employee + date and seeded for the trailing 90 days.
 */
import type { ApiResponse } from "../types/api";
import type { Employee } from "../types/employee";
import type {
  AttendanceSettings,
  AttendanceStatus,
  AttendanceSummary,
  DailyAttendance,
  GeoFence,
  RegularizationRequest,
  RegularizationStatus,
  RegularizationType,
  TeamAttendanceToday,
  AttendanceLocation,
} from "../types/attendance";
import { delay, fail, ok, uid } from "./client";
import { listEmployees } from "./employees";
import { settingsApi, type Shift } from "./settings";
import { leaveApi } from "./leave";
import { dateKey, formatMinutes, isIpAllowed, isWithinGeoFence, minutesBetween, parseHHmm, pad2 } from "../utils/attendanceChecks";

const RECORDS_KEY = "hrms.attendance.records";
const REG_KEY = "hrms.attendance.regularizations";
const SETTINGS_KEY = "hrms.attendance.settings";
const SEED_KEY = "hrms.attendance.seeded.v1";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  captureMode: "web",
  enforceIp: false,
  allowedIps: ["192.168.0.0/16", "10.0.0.0/8"],
  enforceGeo: false,
  geoFences: [
    { id: "gf_hq", name: "Head office — Bengaluru", lat: 12.9716, lng: 77.5946, radiusMeters: 250 },
  ],
  lateGraceMinutes: 15,
  halfDayMinutes: 240,
  fullDayMinutes: 480,
  overtimeAfterMinutes: 540,
  autoClockOutTime: "23:30",
  breakTrackingEnabled: true,
  allowRegularization: true,
  regularizationWindowDays: 30,
  maxRegularizationsPerMonth: 3,
};

function rawRecords(): DailyAttendance[] {
  return read<DailyAttendance[]>(RECORDS_KEY, []);
}
function saveRecords(list: DailyAttendance[]) {
  write(RECORDS_KEY, list);
}
function rawRegs(): RegularizationRequest[] {
  return read<RegularizationRequest[]>(REG_KEY, []);
}
function saveRegs(list: RegularizationRequest[]) {
  write(REG_KEY, list);
}
export function getSettingsSync(): AttendanceSettings {
  return { ...DEFAULT_ATTENDANCE_SETTINGS, ...read<Partial<AttendanceSettings>>(SETTINGS_KEY, {}) };
}

// ───────────────────────── calendar helpers ─────────────────────────

interface CalendarCtx {
  workingDays: number[];
  holidays: Map<string, string>;
}

let calCache: CalendarCtx | null = null;

async function calendar(): Promise<CalendarCtx> {
  if (calCache) return calCache;
  const [cal, hol, nat] = await Promise.all([
    settingsApi.getWorkCalendar(),
    settingsApi.listCompanyHolidays(),
    settingsApi.getNationalHolidays("IN"),
  ]);
  const holidays = new Map<string, string>();
  for (const h of hol.data ?? []) holidays.set(h.date, h.name);
  for (const h of (nat.data ?? []).filter((x) => x.observed)) holidays.set(h.date, h.name);
  calCache = { workingDays: cal.data?.workingDays ?? [1, 2, 3, 4, 5], holidays };
  return calCache;
}

function defaultShift(shifts: Shift[], employee: Employee): Shift | undefined {
  return shifts.find((s) => s.id === employee.shiftId) ?? shifts[0];
}

// ───────────────────────── derivation ─────────────────────────

export function deriveRecord(
  rec: DailyAttendance,
  settings: AttendanceSettings,
  shift?: Shift,
): DailyAttendance {
  if (rec.status === "holiday" || rec.status === "week_off" || rec.status === "on_leave") return rec;
  const breakMinutes = rec.breaks.reduce((sum, b) => (b.end ? sum + minutesBetween(b.start, b.end) : sum), 0);
  const gross = rec.clockIn && rec.clockOut ? minutesBetween(rec.clockIn, rec.clockOut) : 0;
  const workedMinutes = Math.max(0, gross - breakMinutes);

  let lateMinutes = 0;
  let earlyExitMinutes = 0;
  if (shift && rec.clockIn) {
    const inD = new Date(rec.clockIn);
    const actual = inD.getHours() * 60 + inD.getMinutes();
    lateMinutes = Math.max(0, actual - parseHHmm(shift.startTime) - shift.graceMinutes);
  }
  if (shift && rec.clockOut) {
    const outD = new Date(rec.clockOut);
    const actual = outD.getHours() * 60 + outD.getMinutes();
    earlyExitMinutes = Math.max(0, parseHHmm(shift.endTime) - actual);
  }

  let status: AttendanceStatus = rec.status;
  if (!rec.clockIn) {
    status = rec.status === "absent" ? "absent" : "not_marked";
  } else if (!rec.clockOut) {
    status = lateMinutes > 0 ? "late" : "present";
  } else if (workedMinutes < settings.halfDayMinutes) {
    status = "half_day";
  } else if (lateMinutes > 0) {
    status = "late";
  } else {
    status = "present";
  }

  return {
    ...rec,
    breakMinutes,
    workedMinutes,
    lateMinutes,
    earlyExitMinutes,
    overtimeMinutes: Math.max(0, workedMinutes - settings.overtimeAfterMinutes),
    status,
  };
}

// ───────────────────────── seed ─────────────────────────

function rand(seedRef: { v: number }): number {
  seedRef.v = (seedRef.v * 1664525 + 1013904223) % 4294967296;
  return seedRef.v / 4294967296;
}

async function ensureSeed(): Promise<Employee[]> {
  const emps = (await listEmployees()).data ?? [];
  if (typeof window === "undefined") return emps;
  if (window.localStorage.getItem(SEED_KEY)) return emps;

  const settings = getSettingsSync();
  const cal = await calendar();
  const shifts = (await settingsApi.listShifts()).data ?? [];
  const out: DailyAttendance[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  emps.forEach((emp, ei) => {
    const seedRef = { v: 97 + ei * 7919 };
    const shift = defaultShift(shifts, emp);
    for (let back = 89; back >= 0; back -= 1) {
      const d = new Date(today);
      d.setDate(d.getDate() - back);
      const key = dateKey(d);
      const base: DailyAttendance = {
        id: `att_${emp.id}_${key}`,
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        departmentId: emp.departmentId,
        date: key,
        shiftId: shift?.id,
        shiftName: shift?.name,
        breaks: [],
        workedMinutes: 0,
        breakMinutes: 0,
        overtimeMinutes: 0,
        lateMinutes: 0,
        earlyExitMinutes: 0,
        status: "not_marked",
        source: "web",
        regularized: false,
      };

      if (cal.holidays.has(key)) {
        out.push({ ...base, status: "holiday", source: "system", holidayName: cal.holidays.get(key) });
        continue;
      }
      if (!cal.workingDays.includes(d.getDay())) {
        out.push({ ...base, status: "week_off", source: "system" });
        continue;
      }
      if (back === 0) {
        // today stays open so the clock widget drives it
        out.push(base);
        continue;
      }

      const roll = rand(seedRef);
      if (roll < 0.05) {
        out.push({ ...base, status: "on_leave", source: "system", leaveTypeName: "Annual Leave" });
        continue;
      }
      if (roll < 0.08) {
        out.push({ ...base, status: "absent", source: "system" });
        continue;
      }

      const startMin = parseHHmm(shift?.startTime ?? "09:30") + Math.round((rand(seedRef) - 0.35) * 60);
      const durationMin = 470 + Math.round(rand(seedRef) * 130);
      const inD = new Date(d);
      inD.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
      const outD = new Date(inD.getTime() + durationMin * 60000);
      const bStart = new Date(inD.getTime() + 210 * 60000);
      const bEnd = new Date(bStart.getTime() + (25 + Math.round(rand(seedRef) * 25)) * 60000);
      out.push(
        deriveRecord(
          {
            ...base,
            clockIn: inD.toISOString(),
            clockOut: outD.toISOString(),
            breaks: settings.breakTrackingEnabled ? [{ id: uid("brk_"), start: bStart.toISOString(), end: bEnd.toISOString() }] : [],
            source: roll > 0.9 ? "biometric" : "web",
            status: "present",
          },
          settings,
          shift,
        ),
      );
    }
  });

  saveRecords(out);

  // a few seeded regularization requests for the approvals inbox
  const regs: RegularizationRequest[] = [];
  emps.slice(0, 4).forEach((emp, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (3 + i));
    regs.push({
      id: uid("reg_"),
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      departmentId: emp.departmentId,
      date: dateKey(d),
      type: i % 2 === 0 ? "missing_clock_out" : "work_from_home",
      requestedClockIn: "09:30",
      requestedClockOut: "18:30",
      reason: i % 2 === 0 ? "Left for a client meeting and forgot to punch out." : "Approved WFH day, VPN punch did not register.",
      status: "pending",
      appliedAt: new Date(d.getTime() + 36 * 3600000).toISOString(),
    });
  });
  saveRegs(regs);
  window.localStorage.setItem(SEED_KEY, "1");
  return emps;
}

function findOrCreateToday(
  list: DailyAttendance[],
  emp: Employee,
  shift?: Shift,
): DailyAttendance {
  const key = dateKey(new Date());
  const found = list.find((r) => r.employeeId === emp.id && r.date === key);
  if (found) return found;
  const created: DailyAttendance = {
    id: `att_${emp.id}_${key}`,
    employeeId: emp.id,
    employeeName: `${emp.firstName} ${emp.lastName}`,
    departmentId: emp.departmentId,
    date: key,
    shiftId: shift?.id,
    shiftName: shift?.name,
    breaks: [],
    workedMinutes: 0,
    breakMinutes: 0,
    overtimeMinutes: 0,
    lateMinutes: 0,
    earlyExitMinutes: 0,
    status: "not_marked",
    source: "web",
    regularized: false,
  };
  list.push(created);
  return created;
}

function upsert(list: DailyAttendance[], rec: DailyAttendance): DailyAttendance[] {
  const i = list.findIndex((r) => r.employeeId === rec.employeeId && r.date === rec.date);
  if (i === -1) return [...list, rec];
  const next = [...list];
  next[i] = rec;
  return next;
}

/** Deterministic pseudo device IP so IP enforcement is demoable offline. */
export function currentDeviceIp(): string {
  if (typeof window === "undefined") return "192.168.1.20";
  const stored = window.localStorage.getItem("hrms.attendance.deviceIp");
  if (stored) return stored;
  const ip = "192.168.1.20";
  window.localStorage.setItem("hrms.attendance.deviceIp", ip);
  return ip;
}

async function guardPunch(location?: AttendanceLocation): Promise<string | null> {
  const settings = getSettingsSync();
  if (settings.enforceIp && !isIpAllowed(currentDeviceIp(), settings.allowedIps)) {
    return `Your network (${currentDeviceIp()}) is not on the office allow-list.`;
  }
  if (settings.enforceGeo) {
    if (!location) return "Location access is required to clock in from this device.";
    if (!isWithinGeoFence(location, settings.geoFences)) return "You are outside every approved office location.";
  }
  return null;
}

// ───────────────────────── public API ─────────────────────────

export const attendanceApi = {
  async getSettings(): Promise<ApiResponse<AttendanceSettings>> {
    return delay(ok(getSettingsSync()));
  },

  async saveSettings(patch: Partial<AttendanceSettings>): Promise<ApiResponse<AttendanceSettings>> {
    const next = { ...getSettingsSync(), ...patch };
    write(SETTINGS_KEY, next);
    return delay(ok(next));
  },

  async upsertGeoFence(fence: Omit<GeoFence, "id"> & { id?: string }): Promise<ApiResponse<AttendanceSettings>> {
    const s = getSettingsSync();
    const geoFences = fence.id
      ? s.geoFences.map((f) => (f.id === fence.id ? { ...f, ...fence, id: f.id } : f))
      : [...s.geoFences, { ...fence, id: uid("gf_") }];
    return attendanceApi.saveSettings({ geoFences });
  },

  async deleteGeoFence(id: string): Promise<ApiResponse<AttendanceSettings>> {
    const s = getSettingsSync();
    return attendanceApi.saveSettings({ geoFences: s.geoFences.filter((f) => f.id !== id) });
  },

  async getShiftFor(employeeId: string): Promise<Shift | undefined> {
    const emps = await ensureSeed();
    const emp = emps.find((e) => e.id === employeeId);
    const shifts = (await settingsApi.listShifts()).data ?? [];
    return emp ? defaultShift(shifts, emp) : shifts[0];
  },

  async getToday(employeeId: string): Promise<ApiResponse<DailyAttendance>> {
    const emps = await ensureSeed();
    const emp = emps.find((e) => e.id === employeeId);
    if (!emp) return fail<DailyAttendance>("Employee not found", "not_found");
    const shifts = (await settingsApi.listShifts()).data ?? [];
    const list = rawRecords();
    const rec = findOrCreateToday(list, emp, defaultShift(shifts, emp));
    saveRecords(list);
    return delay(ok(deriveRecord(rec, getSettingsSync(), defaultShift(shifts, emp))), 120);
  },

  async clockIn(employeeId: string, opts: { location?: AttendanceLocation } = {}): Promise<ApiResponse<DailyAttendance>> {
    const emps = await ensureSeed();
    const emp = emps.find((e) => e.id === employeeId);
    if (!emp) return fail<DailyAttendance>("Employee not found", "not_found");
    const blocked = await guardPunch(opts.location);
    if (blocked) return fail<DailyAttendance>(blocked, "blocked");
    const shifts = (await settingsApi.listShifts()).data ?? [];
    const shift = defaultShift(shifts, emp);
    let list = rawRecords();
    const rec = findOrCreateToday(list, emp, shift);
    if (rec.clockIn) return fail<DailyAttendance>("You are already clocked in for today.", "already");
    const next = deriveRecord(
      { ...rec, clockIn: new Date().toISOString(), source: "web", clockInLocation: opts.location, ip: currentDeviceIp() },
      getSettingsSync(),
      shift,
    );
    list = upsert(list, next);
    saveRecords(list);
    return delay(ok(next), 150);
  },

  async clockOut(employeeId: string, opts: { location?: AttendanceLocation } = {}): Promise<ApiResponse<DailyAttendance>> {
    const emps = await ensureSeed();
    const emp = emps.find((e) => e.id === employeeId);
    if (!emp) return fail<DailyAttendance>("Employee not found", "not_found");
    const blocked = await guardPunch(opts.location);
    if (blocked) return fail<DailyAttendance>(blocked, "blocked");
    const shifts = (await settingsApi.listShifts()).data ?? [];
    const shift = defaultShift(shifts, emp);
    let list = rawRecords();
    const rec = findOrCreateToday(list, emp, shift);
    if (!rec.clockIn) return fail<DailyAttendance>("Clock in before clocking out.", "invalid");
    if (rec.clockOut) return fail<DailyAttendance>("You already clocked out today.", "already");
    const now = new Date().toISOString();
    const breaks = rec.breaks.map((b) => (b.end ? b : { ...b, end: now }));
    const next = deriveRecord({ ...rec, breaks, clockOut: now, clockOutLocation: opts.location }, getSettingsSync(), shift);
    list = upsert(list, next);
    saveRecords(list);
    return delay(ok(next), 150);
  },

  async startBreak(employeeId: string): Promise<ApiResponse<DailyAttendance>> {
    const emps = await ensureSeed();
    const emp = emps.find((e) => e.id === employeeId);
    if (!emp) return fail<DailyAttendance>("Employee not found", "not_found");
    const shift = await attendanceApi.getShiftFor(employeeId);
    let list = rawRecords();
    const rec = findOrCreateToday(list, emp, shift);
    if (!rec.clockIn || rec.clockOut) return fail<DailyAttendance>("You need an open shift to take a break.", "invalid");
    if (rec.breaks.some((b) => !b.end)) return fail<DailyAttendance>("A break is already running.", "already");
    const next = deriveRecord(
      { ...rec, breaks: [...rec.breaks, { id: uid("brk_"), start: new Date().toISOString() }] },
      getSettingsSync(),
      shift,
    );
    list = upsert(list, next);
    saveRecords(list);
    return delay(ok(next), 120);
  },

  async endBreak(employeeId: string): Promise<ApiResponse<DailyAttendance>> {
    const emps = await ensureSeed();
    const emp = emps.find((e) => e.id === employeeId);
    if (!emp) return fail<DailyAttendance>("Employee not found", "not_found");
    const shift = await attendanceApi.getShiftFor(employeeId);
    let list = rawRecords();
    const rec = findOrCreateToday(list, emp, shift);
    const open = rec.breaks.find((b) => !b.end);
    if (!open) return fail<DailyAttendance>("No break is running.", "invalid");
    const next = deriveRecord(
      { ...rec, breaks: rec.breaks.map((b) => (b.id === open.id ? { ...b, end: new Date().toISOString() } : b)) },
      getSettingsSync(),
      shift,
    );
    list = upsert(list, next);
    saveRecords(list);
    return delay(ok(next), 120);
  },

  async listRecords(filters: {
    employeeId?: string;
    employeeIds?: string[];
    departmentId?: string;
    from?: string;
    to?: string;
    statuses?: AttendanceStatus[];
    q?: string;
  } = {}): Promise<ApiResponse<DailyAttendance[]>> {
    await ensureSeed();
    let list = rawRecords();
    if (filters.employeeId) list = list.filter((r) => r.employeeId === filters.employeeId);
    if (filters.employeeIds?.length) list = list.filter((r) => filters.employeeIds!.includes(r.employeeId));
    if (filters.departmentId) list = list.filter((r) => r.departmentId === filters.departmentId);
    if (filters.from) list = list.filter((r) => r.date >= filters.from!);
    if (filters.to) list = list.filter((r) => r.date <= filters.to!);
    if (filters.statuses?.length) list = list.filter((r) => filters.statuses!.includes(r.status));
    if (filters.q) {
      const q = filters.q.toLowerCase();
      list = list.filter((r) => r.employeeName.toLowerCase().includes(q));
    }
    list.sort((a, b) => (a.date === b.date ? a.employeeName.localeCompare(b.employeeName) : b.date.localeCompare(a.date)));
    return delay(ok(list), 180);
  },

  async getMonth(employeeId: string, year: number, month: number): Promise<ApiResponse<DailyAttendance[]>> {
    const from = `${year}-${pad2(month + 1)}-01`;
    const to = `${year}-${pad2(month + 1)}-${pad2(new Date(year, month + 1, 0).getDate())}`;
    return attendanceApi.listRecords({ employeeId, from, to });
  },

  async getSummary(employeeId: string, from: string, to: string): Promise<ApiResponse<AttendanceSummary>> {
    const res = await attendanceApi.listRecords({ employeeId, from, to });
    const list = res.data ?? [];
    const count = (s: AttendanceStatus) => list.filter((r) => r.status === s).length;
    const workedMinutes = list.reduce((n, r) => n + r.workedMinutes, 0);
    const workingDays = list.filter((r) => r.status !== "week_off" && r.status !== "holiday").length;
    const attended = count("present") + count("late") + count("half_day") * 0.5;
    const withWork = list.filter((r) => r.workedMinutes > 0).length;
    return ok({
      totalDays: list.length,
      present: count("present"),
      late: count("late"),
      halfDay: count("half_day"),
      absent: count("absent"),
      onLeave: count("on_leave"),
      weekOff: count("week_off"),
      holiday: count("holiday"),
      notMarked: count("not_marked"),
      workedMinutes,
      avgWorkedMinutes: withWork ? Math.round(workedMinutes / withWork) : 0,
      overtimeMinutes: list.reduce((n, r) => n + r.overtimeMinutes, 0),
      attendancePct: workingDays ? Math.round((attended / workingDays) * 100) : 0,
    });
  },

  async teamToday(opts: { managerId?: string; departmentId?: string } = {}): Promise<ApiResponse<TeamAttendanceToday[]>> {
    const emps = await ensureSeed();
    const today = dateKey(new Date());
    const records = rawRecords().filter((r) => r.date === today);
    let people = emps;
    if (opts.managerId) people = people.filter((e) => e.reportingManagerId === opts.managerId);
    if (opts.departmentId) people = people.filter((e) => e.departmentId === opts.departmentId);
    const rows: TeamAttendanceToday[] = people.map((e) => {
      const rec = records.find((r) => r.employeeId === e.id);
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
    });
    rows.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
    return delay(ok(rows), 180);
  },

  /** Manual create/edit of a single day by HR. */
  async saveManualEntry(input: {
    employeeId: string;
    date: string;
    clockIn?: string; // HH:mm
    clockOut?: string; // HH:mm
    status?: AttendanceStatus;
    note?: string;
    source?: DailyAttendance["source"];
  }): Promise<ApiResponse<DailyAttendance>> {
    const emps = await ensureSeed();
    const emp = emps.find((e) => e.id === input.employeeId);
    if (!emp) return fail<DailyAttendance>("Employee not found", "not_found");
    if (input.clockIn && input.clockOut && parseHHmm(input.clockOut) <= parseHHmm(input.clockIn)) {
      return fail<DailyAttendance>("Clock out must be after clock in.", "invalid");
    }
    const shift = await attendanceApi.getShiftFor(input.employeeId);
    const list = rawRecords();
    const existing = list.find((r) => r.employeeId === input.employeeId && r.date === input.date);
    const base: DailyAttendance = existing ?? {
      id: `att_${input.employeeId}_${input.date}`,
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      departmentId: emp.departmentId,
      date: input.date,
      shiftId: shift?.id,
      shiftName: shift?.name,
      breaks: [],
      workedMinutes: 0,
      breakMinutes: 0,
      overtimeMinutes: 0,
      lateMinutes: 0,
      earlyExitMinutes: 0,
      status: "not_marked",
      source: "manual",
      regularized: false,
    };
    const toIso = (hhmm?: string) => {
      if (!hhmm) return undefined;
      const d = new Date(`${input.date}T00:00:00`);
      d.setMinutes(parseHHmm(hhmm));
      return d.toISOString();
    };
    const next = deriveRecord(
      {
        ...base,
        clockIn: input.clockIn ? toIso(input.clockIn) : base.clockIn,
        clockOut: input.clockOut ? toIso(input.clockOut) : base.clockOut,
        status: input.status ?? base.status,
        note: input.note ?? base.note,
        source: input.source ?? "manual",
        regularized: true,
      },
      getSettingsSync(),
      shift,
    );
    saveRecords(upsert(list, next));
    return delay(ok(next));
  },

  /**
   * CSV import. Expected header: employeeCode,date,clockIn,clockOut
   * Returns per-row outcome so the UI can show a preview table.
   */
  async importCsv(text: string, commit: boolean): Promise<ApiResponse<{ rows: Array<{ line: number; employeeName?: string; date: string; clockIn?: string; clockOut?: string; error?: string }>; imported: number }>> {
    const emps = await ensureSeed();
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (!lines.length) return fail("The file is empty.", "invalid");
    const start = lines[0].toLowerCase().includes("employee") ? 1 : 0;
    const rows: Array<{ line: number; employeeName?: string; date: string; clockIn?: string; clockOut?: string; error?: string; employeeId?: string }> = [];
    for (let i = start; i < lines.length; i += 1) {
      const [code, date, cin, cout] = lines[i].split(",").map((v) => v?.trim());
      const emp = emps.find((e) => e.employeeCode.toLowerCase() === (code ?? "").toLowerCase());
      const valid = /^\d{4}-\d{2}-\d{2}$/.test(date ?? "");
      rows.push({
        line: i + 1,
        employeeId: emp?.id,
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : undefined,
        date: date ?? "",
        clockIn: cin || undefined,
        clockOut: cout || undefined,
        error: !emp ? `Unknown employee code "${code}"` : !valid ? "Date must be YYYY-MM-DD" : undefined,
      });
    }
    let imported = 0;
    if (commit) {
      for (const r of rows) {
        if (r.error || !r.employeeId) continue;
        await attendanceApi.saveManualEntry({
          employeeId: r.employeeId,
          date: r.date,
          clockIn: r.clockIn,
          clockOut: r.clockOut,
          source: "import",
        });
        imported += 1;
      }
    }
    return delay(ok({ rows: rows.map(({ employeeId: _id, ...rest }) => rest), imported }));
  },

  // ── regularization ──

  async listRegularizations(filters: { employeeId?: string; managerId?: string; statuses?: RegularizationStatus[] } = {}): Promise<ApiResponse<RegularizationRequest[]>> {
    const emps = await ensureSeed();
    let list = rawRegs();
    if (filters.employeeId) list = list.filter((r) => r.employeeId === filters.employeeId);
    if (filters.managerId) {
      const ids = new Set(emps.filter((e) => e.reportingManagerId === filters.managerId).map((e) => e.id));
      list = list.filter((r) => ids.has(r.employeeId));
    }
    if (filters.statuses?.length) list = list.filter((r) => filters.statuses!.includes(r.status));
    list.sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
    return delay(ok(list), 180);
  },

  async createRegularization(input: {
    employeeId: string;
    date: string;
    type: RegularizationType;
    requestedClockIn?: string;
    requestedClockOut?: string;
    reason: string;
  }): Promise<ApiResponse<RegularizationRequest>> {
    const emps = await ensureSeed();
    const emp = emps.find((e) => e.id === input.employeeId);
    if (!emp) return fail<RegularizationRequest>("Employee not found", "not_found");
    const settings = getSettingsSync();
    if (!settings.allowRegularization) return fail<RegularizationRequest>("Regularization is disabled by your administrator.", "disabled");

    const dayMs = 86_400_000;
    const ageDays = Math.floor((Date.now() - new Date(`${input.date}T00:00:00`).getTime()) / dayMs);
    if (ageDays < 0) return fail<RegularizationRequest>("You cannot regularise a future date.", "invalid");
    if (ageDays > settings.regularizationWindowDays) {
      return fail<RegularizationRequest>(`Requests are only allowed within ${settings.regularizationWindowDays} days.`, "window");
    }
    if (input.reason.trim().length < 10) return fail<RegularizationRequest>("Add a reason of at least 10 characters.", "invalid");

    const list = rawRegs();
    if (list.some((r) => r.employeeId === input.employeeId && r.date === input.date && r.status === "pending")) {
      return fail<RegularizationRequest>("A pending request already exists for that date.", "duplicate");
    }
    const month = input.date.slice(0, 7);
    const used = list.filter((r) => r.employeeId === input.employeeId && r.date.startsWith(month) && r.status !== "rejected" && r.status !== "cancelled").length;
    if (used >= settings.maxRegularizationsPerMonth) {
      return fail<RegularizationRequest>(`You have used all ${settings.maxRegularizationsPerMonth} regularizations for ${month}.`, "limit");
    }

    const created: RegularizationRequest = {
      id: uid("reg_"),
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      departmentId: emp.departmentId,
      date: input.date,
      type: input.type,
      requestedClockIn: input.requestedClockIn,
      requestedClockOut: input.requestedClockOut,
      reason: input.reason.trim(),
      status: "pending",
      appliedAt: new Date().toISOString(),
    };
    saveRegs([created, ...list]);
    return delay(ok(created));
  },

  async cancelRegularization(id: string): Promise<ApiResponse<true>> {
    const list = rawRegs();
    const found = list.find((r) => r.id === id);
    if (!found) return fail<true>("Request not found", "not_found");
    if (found.status !== "pending") return fail<true>("Only pending requests can be cancelled.", "invalid");
    saveRegs(list.map((r) => (r.id === id ? { ...r, status: "cancelled" as RegularizationStatus } : r)));
    return delay(ok(true as const));
  },

  async actOnRegularization(input: {
    id: string;
    action: "approved" | "rejected";
    reviewer: string;
    comment?: string;
  }): Promise<ApiResponse<RegularizationRequest>> {
    const list = rawRegs();
    const found = list.find((r) => r.id === input.id);
    if (!found) return fail<RegularizationRequest>("Request not found", "not_found");
    if (found.status !== "pending") return fail<RegularizationRequest>("This request was already reviewed.", "invalid");
    if (input.action === "rejected" && !input.comment?.trim()) {
      return fail<RegularizationRequest>("A comment is required when rejecting.", "invalid");
    }
    const next: RegularizationRequest = {
      ...found,
      status: input.action,
      reviewedBy: input.reviewer,
      reviewedAt: new Date().toISOString(),
      reviewComment: input.comment?.trim(),
    };
    saveRegs(list.map((r) => (r.id === next.id ? next : r)));
    if (input.action === "approved") {
      await attendanceApi.saveManualEntry({
        employeeId: next.employeeId,
        date: next.date,
        clockIn: next.requestedClockIn,
        clockOut: next.requestedClockOut,
        note: `Regularised: ${next.reason}`,
        source: "manual",
      });
    }
    return delay(ok(next));
  },

  async getStats(): Promise<ApiResponse<{ presentToday: number; lateToday: number; absentToday: number; onLeaveToday: number; pendingRegularizations: number; avgWorkedLabel: string }>> {
    const emps = await ensureSeed();
    const today = dateKey(new Date());
    const records = rawRecords().filter((r) => r.date === today);
    const count = (s: AttendanceStatus) => records.filter((r) => r.status === s).length;
    const monthFrom = `${today.slice(0, 7)}-01`;
    const monthRecords = rawRecords().filter((r) => r.date >= monthFrom && r.workedMinutes > 0);
    const avg = monthRecords.length
      ? Math.round(monthRecords.reduce((n, r) => n + r.workedMinutes, 0) / monthRecords.length)
      : 0;
    void emps;
    return delay(
      ok({
        presentToday: count("present"),
        lateToday: count("late"),
        absentToday: count("absent"),
        onLeaveToday: count("on_leave"),
        pendingRegularizations: rawRegs().filter((r) => r.status === "pending").length,
        avgWorkedLabel: formatMinutes(avg),
      }),
      160,
    );
  },

  /** Sync approved leave days into attendance so calendars stay consistent. */
  async syncLeave(employeeId: string): Promise<ApiResponse<number>> {
    await ensureSeed();
    const res = await leaveApi.listRequests({ employeeId, statuses: ["approved", "auto_approved"] });
    const list = rawRecords();
    let touched = 0;
    let next = list;
    for (const req of res.data ?? []) {
      for (let t = new Date(req.startDate).getTime(); t <= new Date(req.endDate).getTime(); t += 86_400_000) {
        const key = dateKey(new Date(t));
        const rec = next.find((r) => r.employeeId === employeeId && r.date === key);
        if (!rec || rec.status === "week_off" || rec.status === "holiday" || rec.clockIn) continue;
        next = upsert(next, { ...rec, status: "on_leave", source: "system", leaveTypeName: req.leaveType?.name });
        touched += 1;
      }
    }
    saveRecords(next);
    return ok(touched);
  },

  recordsToCsv(list: DailyAttendance[]): string {
    const head = ["Employee", "Date", "Shift", "Clock in", "Clock out", "Worked", "Break", "Overtime", "Late (min)", "Status", "Source"];
    const body = list.map((r) => [
      r.employeeName,
      r.date,
      r.shiftName ?? "",
      r.clockIn ? new Date(r.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
      r.clockOut ? new Date(r.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
      formatMinutes(r.workedMinutes),
      formatMinutes(r.breakMinutes),
      formatMinutes(r.overtimeMinutes),
      String(r.lateMinutes),
      r.status,
      r.source,
    ]);
    return [head, ...body].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  },
};