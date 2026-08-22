/** Attendance & time-tracking domain types (Phase 6). */

export type AttendanceStatus =
  | "present"
  | "late"
  | "half_day"
  | "absent"
  | "on_leave"
  | "holiday"
  | "week_off"
  | "not_marked";

export type AttendanceSource = "web" | "mobile" | "biometric" | "manual" | "import" | "system";

export type ClockState = "not_clocked_in" | "clocked_in" | "on_break" | "clocked_out";

export interface BreakEntry {
  id: string;
  start: string; // ISO
  end?: string; // ISO
}

export interface AttendanceLocation {
  lat: number;
  lng: number;
  label?: string;
}

export interface DailyAttendance {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentId?: string;
  date: string; // YYYY-MM-DD
  shiftId?: string;
  shiftName?: string;
  clockIn?: string; // ISO
  clockOut?: string; // ISO
  breaks: BreakEntry[];
  workedMinutes: number;
  breakMinutes: number;
  overtimeMinutes: number;
  lateMinutes: number;
  earlyExitMinutes: number;
  status: AttendanceStatus;
  source: AttendanceSource;
  clockInLocation?: AttendanceLocation;
  clockOutLocation?: AttendanceLocation;
  ip?: string;
  note?: string;
  regularized: boolean;
  leaveTypeName?: string;
  holidayName?: string;
}

export type RegularizationType =
  | "missing_clock_in"
  | "missing_clock_out"
  | "wrong_time"
  | "work_from_home"
  | "on_duty";

export type RegularizationStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface RegularizationRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentId?: string;
  date: string; // YYYY-MM-DD
  type: RegularizationType;
  requestedClockIn?: string; // HH:mm
  requestedClockOut?: string; // HH:mm
  reason: string;
  status: RegularizationStatus;
  appliedAt: string; // ISO
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComment?: string;
}

export interface GeoFence {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
}

export interface AttendanceSettings {
  captureMode: "web" | "web_biometric" | "biometric";
  enforceIp: boolean;
  allowedIps: string[]; // CIDR or plain IPv4
  enforceGeo: boolean;
  geoFences: GeoFence[];
  lateGraceMinutes: number;
  halfDayMinutes: number;
  fullDayMinutes: number;
  overtimeAfterMinutes: number;
  autoClockOutTime: string; // HH:mm
  breakTrackingEnabled: boolean;
  allowRegularization: boolean;
  regularizationWindowDays: number;
  maxRegularizationsPerMonth: number;
}

export interface AttendanceSummary {
  totalDays: number;
  present: number;
  late: number;
  halfDay: number;
  absent: number;
  onLeave: number;
  weekOff: number;
  holiday: number;
  notMarked: number;
  workedMinutes: number;
  avgWorkedMinutes: number;
  overtimeMinutes: number;
  attendancePct: number;
}

export interface TeamAttendanceToday {
  employeeId: string;
  employeeName: string;
  departmentId?: string;
  designation?: string;
  avatarUrl?: string;
  status: AttendanceStatus;
  clockIn?: string;
  clockOut?: string;
  workedMinutes: number;
  lateMinutes: number;
}

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  late: "Late",
  half_day: "Half day",
  absent: "Absent",
  on_leave: "On leave",
  holiday: "Holiday",
  week_off: "Week off",
  not_marked: "Not marked",
};

export const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: "#16A34A",
  late: "#F59E0B",
  half_day: "#0891B2",
  absent: "#DC2626",
  on_leave: "#7C3AED",
  holiday: "#DB2777",
  week_off: "#9CA3AF",
  not_marked: "#D1D5DB",
};

export const REGULARIZATION_TYPE_LABELS: Record<RegularizationType, string> = {
  missing_clock_in: "Missing clock in",
  missing_clock_out: "Missing clock out",
  wrong_time: "Incorrect punch time",
  work_from_home: "Work from home",
  on_duty: "On duty / client visit",
};