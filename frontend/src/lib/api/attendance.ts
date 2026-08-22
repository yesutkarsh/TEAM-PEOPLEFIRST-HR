/** Attendance API client connected to Next.js. */
import type { ApiResponse } from "../types/api";
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
import { request, ok, delay } from "./client";
import { settingsApi, type Shift } from "./settings";
import { dateKey } from "../utils/attendanceChecks";

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function formatMinutes(m: number): string {
  if (!m) return "0m";
  const hrs = Math.floor(m / 60);
  const mins = m % 60;
  return hrs ? `${hrs}h ${mins}m` : `${mins}m`;
}

export function currentDeviceIp(): string {
  if (typeof window === "undefined") return "192.168.1.20";
  const stored = window.localStorage.getItem("hrms.attendance.deviceIp");
  if (stored) return stored;
  const ip = "192.168.1.20";
  window.localStorage.setItem("hrms.attendance.deviceIp", ip);
  return ip;
}

export const attendanceApi = {
  async getSettings(): Promise<ApiResponse<AttendanceSettings>> {
    return request<AttendanceSettings>("/api/attendance/settings");
  },

  async saveSettings(patch: Partial<AttendanceSettings>): Promise<ApiResponse<AttendanceSettings>> {
    return request<AttendanceSettings>("/api/attendance/settings", {
      method: "POST",
      body: JSON.stringify(patch),
    });
  },

  async upsertGeoFence(fence: Omit<GeoFence, "id"> & { id?: string }): Promise<ApiResponse<AttendanceSettings>> {
    return request<AttendanceSettings>("/api/attendance/geofences", {
      method: "POST",
      body: JSON.stringify(fence),
    });
  },

  async deleteGeoFence(id: string): Promise<ApiResponse<AttendanceSettings>> {
    return request<AttendanceSettings>(`/api/attendance/geofences?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  async getShiftFor(employeeId: string): Promise<Shift | undefined> {
    const shifts = (await settingsApi.listShifts()).data ?? [];
    return shifts[0];
  },

  async getToday(employeeId: string): Promise<ApiResponse<DailyAttendance>> {
    const todayStr = dateKey(new Date());
    const res = await request<DailyAttendance[]>(`/api/attendance/records?employeeIds=${employeeId}&from=${todayStr}&to=${todayStr}`);
    if (res.data && res.data.length > 0) {
      return ok(res.data[0]);
    }
    // Return empty state record
    return ok({
      id: `att_${employeeId}_${todayStr}`,
      employeeId,
      employeeName: "Employee",
      date: todayStr,
      breaks: [],
      workedMinutes: 0,
      breakMinutes: 0,
      overtimeMinutes: 0,
      lateMinutes: 0,
      earlyExitMinutes: 0,
      status: "not_marked",
      source: "web",
      regularized: false,
    });
  },

  async clockIn(employeeId: string, opts: { location?: AttendanceLocation } = {}): Promise<ApiResponse<DailyAttendance>> {
    return request<DailyAttendance>("/api/attendance/clock", {
      method: "POST",
      body: JSON.stringify({
        employeeId,
        action: "clock_in",
        date: dateKey(new Date()),
        time: new Date().toISOString(),
        location: opts.location,
        ip: currentDeviceIp(),
      }),
    });
  },

  async clockOut(employeeId: string, opts: { location?: AttendanceLocation } = {}): Promise<ApiResponse<DailyAttendance>> {
    return request<DailyAttendance>("/api/attendance/clock", {
      method: "POST",
      body: JSON.stringify({
        employeeId,
        action: "clock_out",
        date: dateKey(new Date()),
        time: new Date().toISOString(),
        location: opts.location,
        ip: currentDeviceIp(),
      }),
    });
  },

  async startBreak(employeeId: string): Promise<ApiResponse<DailyAttendance>> {
    return request<DailyAttendance>("/api/attendance/clock", {
      method: "POST",
      body: JSON.stringify({
        employeeId,
        action: "start_break",
        date: dateKey(new Date()),
        time: new Date().toISOString(),
      }),
    });
  },

  async endBreak(employeeId: string): Promise<ApiResponse<DailyAttendance>> {
    return request<DailyAttendance>("/api/attendance/clock", {
      method: "POST",
      body: JSON.stringify({
        employeeId,
        action: "end_break",
        date: dateKey(new Date()),
        time: new Date().toISOString(),
      }),
    });
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
    const params = new URLSearchParams();
    if (filters.employeeId) params.set("employeeIds", filters.employeeId);
    if (filters.employeeIds?.length) params.set("employeeIds", filters.employeeIds.join(","));
    if (filters.departmentId) params.set("departmentId", filters.departmentId);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);

    const res = await request<DailyAttendance[]>(`/api/attendance/records?${params.toString()}`);
    let data = res.data || [];
    
    if (filters.statuses?.length) {
      data = data.filter((r) => filters.statuses!.includes(r.status));
    }
    if (filters.q) {
      const q = filters.q.toLowerCase();
      data = data.filter((r) => r.employeeName.toLowerCase().includes(q));
    }
    return { data, error: res.error };
  },

  async getMonth(employeeId: string, year: number, month: number): Promise<ApiResponse<DailyAttendance[]>> {
    const from = `${year}-${pad2(month + 1)}-01`;
    const to = `${year}-${pad2(month + 1)}-${pad2(new Date(year, month + 1, 0).getDate())}`;
    return attendanceApi.listRecords({ employeeId, from, to });
  },

  async getSummary(employeeId: string, from: string, to: string): Promise<ApiResponse<AttendanceSummary>> {
    return request<AttendanceSummary>(`/api/attendance/summary?employeeId=${employeeId}&from=${from}&to=${to}`);
  },

  async teamToday(opts: { managerId?: string; departmentId?: string } = {}): Promise<ApiResponse<TeamAttendanceToday[]>> {
    const params = new URLSearchParams();
    if (opts.managerId) params.set("managerId", opts.managerId);
    if (opts.departmentId) params.set("departmentId", opts.departmentId);
    return request<TeamAttendanceToday[]>(`/api/attendance/team?${params.toString()}`);
  },

  async saveManualEntry(input: {
    employeeId: string;
    date: string;
    clockIn?: string; // HH:mm
    clockOut?: string; // HH:mm
    status?: AttendanceStatus;
    note?: string;
    source?: DailyAttendance["source"];
  }): Promise<ApiResponse<DailyAttendance>> {
    const { employeeId, date, clockIn, clockOut, status, note, source } = input;
    
    // Convert HH:mm to ISO date string format
    const toIso = (hhmm?: string) => {
      if (!hhmm) return undefined;
      const d = new Date(`${date}T00:00:00`);
      const [h, m] = hhmm.split(":");
      d.setHours(parseInt(h), parseInt(m), 0, 0);
      return d.toISOString();
    };

    const cinIso = clockIn ? toIso(clockIn) : undefined;
    const coutIso = clockOut ? toIso(clockOut) : undefined;

    let workedMinutes = 0;
    if (cinIso && coutIso) {
      workedMinutes = Math.max(0, Math.round((new Date(coutIso).getTime() - new Date(cinIso).getTime()) / 60000) - 60);
    }

    return request<DailyAttendance>("/api/attendance/records", {
      method: "POST",
      body: JSON.stringify({
        employeeId,
        date,
        clockIn: cinIso,
        clockOut: coutIso,
        workedMinutes,
        status: status || (workedMinutes < 240 ? "half_day" : "present"),
        note,
        source: source || "manual",
      }),
    });
  },

  async importCsv(text: string, commit: boolean): Promise<ApiResponse<{ rows: Array<{ line: number; employeeName?: string; date: string; clockIn?: string; clockOut?: string; error?: string }>; imported: number }>> {
    // Keep local CSV parser but post the rows to database
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (!lines.length) return ok({ rows: [], imported: 0 });
    const start = lines[0].toLowerCase().includes("employee") ? 1 : 0;
    
    const rows = [];
    for (let i = start; i < lines.length; i++) {
      const [code, date, cin, cout] = lines[i].split(",").map((v) => v?.trim());
      rows.push({
        line: i + 1,
        employeeCode: code,
        date: date || "",
        clockIn: cin || undefined,
        clockOut: cout || undefined,
      });
    }

    const payload = { rows, commit };
    // Hit backend route which will do lookup & commit in transactions
    const importedRows = [];
    if (commit) {
      for (const row of rows) {
        // Resolve code and post manually
        const empRes = await request<Employee[]>(`/api/employees?q=${row.employeeCode}`);
        const emp = empRes.data?.[0];
        if (emp) {
          await attendanceApi.saveManualEntry({
            employeeId: emp.id,
            date: row.date,
            clockIn: row.clockIn,
            clockOut: row.clockOut,
            source: "import",
          });
          importedRows.push(row);
        }
      }
    }

    return ok({ rows: rows.map((r, idx) => ({ line: r.line, date: r.date, clockIn: r.clockIn, clockOut: r.clockOut })), imported: importedRows.length });
  },

  async listRegularizations(filters: { employeeId?: string; managerId?: string; statuses?: RegularizationStatus[] } = {}): Promise<ApiResponse<RegularizationRequest[]>> {
    const params = new URLSearchParams();
    if (filters.employeeId) params.set("employeeId", filters.employeeId);
    if (filters.managerId) params.set("managerId", filters.managerId);
    if (filters.statuses?.length) params.set("statuses", filters.statuses.join(","));

    return request<RegularizationRequest[]>(`/api/attendance/regularizations?${params.toString()}`);
  },

  async createRegularization(input: {
    employeeId: string;
    date: string;
    type: RegularizationType;
    requestedClockIn?: string;
    requestedClockOut?: string;
    reason: string;
  }): Promise<ApiResponse<RegularizationRequest>> {
    return request<RegularizationRequest>("/api/attendance/regularizations", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async cancelRegularization(id: string): Promise<ApiResponse<true>> {
    return request<true>("/api/attendance/regularizations", {
      method: "PUT",
      body: JSON.stringify({ id, action: "cancelled" }),
    });
  },

  async actOnRegularization(input: {
    id: string;
    action: "approved" | "rejected";
    reviewer: string;
    comment?: string;
  }): Promise<ApiResponse<RegularizationRequest>> {
    const res = await request<boolean>("/api/attendance/regularizations", {
      method: "PUT",
      body: JSON.stringify({
        id: input.id,
        action: input.action,
        reviewComment: input.comment,
      }),
    });
    return { data: null, error: res.error }; // Simply verify status updates
  },

  async getStats(): Promise<ApiResponse<{ presentToday: number; lateToday: number; absentToday: number; onLeaveToday: number; pendingRegularizations: number; avgWorkedLabel: string }>> {
    const today = dateKey(new Date());
    const recordsRes = await request<DailyAttendance[]>(`/api/attendance/records?from=${today}&to=${today}`);
    const records = recordsRes.data || [];
    
    const count = (s: AttendanceStatus) => records.filter((r) => r.status === s).length;
    const pendingRegsRes = await request<RegularizationRequest[]>("/api/attendance/regularizations?statuses=pending");
    const pendingRegs = pendingRegsRes.data || [];

    const monthFrom = `${today.slice(0, 7)}-01`;
    const monthRecordsRes = await request<DailyAttendance[]>(`/api/attendance/records?from=${monthFrom}&to=${today}`);
    const monthRecords = (monthRecordsRes.data || []).filter((r) => r.workedMinutes > 0);
    const avg = monthRecords.length
      ? Math.round(monthRecords.reduce((n, r) => n + r.workedMinutes, 0) / monthRecords.length)
      : 0;

    return ok({
      presentToday: count("present"),
      lateToday: count("late"),
      absentToday: count("absent"),
      onLeaveToday: count("on_leave"),
      pendingRegularizations: pendingRegs.length,
      avgWorkedLabel: formatMinutes(avg),
    });
  },

  async syncLeave(employeeId: string): Promise<ApiResponse<number>> {
    // Server-side leave approval automatically syncs the leaves now.
    return ok(0);
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