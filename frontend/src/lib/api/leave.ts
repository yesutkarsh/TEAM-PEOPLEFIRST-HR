/**
 * Leave management mock API. Browser-storage backed, no backend.
 * Dates are stored as ISO strings and revived into Date objects on read.
 */
import type { ApiResponse } from "../types/api";
import type { Employee } from "../types/employee";
import type {
  LeaveAdjustment,
  LeaveApproval,
  LeaveBalance,
  LeavePolicy,
  LeaveRequest,
  LeaveRequestStatus,
  LeaveType,
  TeamLeaveEntry,
} from "../types/leave";
import { delay, fail, ok, uid } from "./client";
import { listEmployees } from "./employees";
import { settingsApi } from "./settings";
import { calculateWorkingDays, overlaps, startOfDay, toKey } from "../utils/workingDays";

const TYPES_KEY = "hrms.leave.types";
const POLICIES_KEY = "hrms.leave.policies";
const REQUESTS_KEY = "hrms.leave.requests";
const ADJUSTMENTS_KEY = "hrms.leave.adjustments";
const ASSIGN_KEY = "hrms.leave.policyAssignments";

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function reviver(_k: string, v: unknown) {
  if (typeof v === "string" && ISO_RE.test(v)) return new Date(v);
  return v;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw, reviver) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

// ───────────────────────── seed data ─────────────────────────

const DEFAULT_TYPES: LeaveType[] = [
  {
    id: "lt_annual", name: "Annual Leave", code: "AL", category: "earned",
    description: "Planned time off accrued through the year.",
    isPaid: true, applicableGender: "all", allowHalfDay: true, documentRequired: "never",
    minDaysPerRequest: 0.5, maxDaysPerRequest: 15, accrualType: "monthly", annualAllocation: 18,
    carryForwardMax: 10, carryForwardLapseDate: "03-31", encashmentAllowed: true, encashmentMaxDays: 5,
    color: "#2563EB", isActive: true,
  },
  {
    id: "lt_sick", name: "Sick Leave", code: "SL", category: "statutory",
    description: "For illness and medical recovery.",
    isPaid: true, applicableGender: "all", allowHalfDay: true, documentRequired: "after_n_days",
    documentAfterDays: 3, minDaysPerRequest: 0.5, maxDaysPerRequest: 10, accrualType: "upfront",
    annualAllocation: 12, carryForwardMax: 0, encashmentAllowed: false,
    color: "#DC2626", isActive: true,
  },
  {
    id: "lt_casual", name: "Casual Leave", code: "CL", category: "earned",
    description: "Short-notice personal time off.",
    isPaid: true, applicableGender: "all", allowHalfDay: true, documentRequired: "never",
    minDaysPerRequest: 0.5, maxDaysPerRequest: 3, accrualType: "quarterly", annualAllocation: 8,
    carryForwardMax: 0, encashmentAllowed: false, color: "#F59E0B", isActive: true,
  },
  {
    id: "lt_maternity", name: "Maternity Leave", code: "ML", category: "statutory",
    description: "Statutory maternity entitlement.",
    isPaid: true, applicableGender: "female", allowHalfDay: false, documentRequired: "always",
    minDaysPerRequest: 1, accrualType: "on_service_completion", annualAllocation: 182,
    encashmentAllowed: false, color: "#DB2777", isActive: true,
  },
  {
    id: "lt_paternity", name: "Paternity Leave", code: "PL", category: "statutory",
    description: "Statutory paternity entitlement.",
    isPaid: true, applicableGender: "male", allowHalfDay: false, documentRequired: "always",
    minDaysPerRequest: 1, maxDaysPerRequest: 15, accrualType: "on_service_completion",
    annualAllocation: 15, encashmentAllowed: false, color: "#0891B2", isActive: true,
  },
  {
    id: "lt_lop", name: "Loss of Pay", code: "LOP", category: "loss_of_pay",
    description: "Unpaid leave once balances are exhausted.",
    isPaid: false, applicableGender: "all", allowHalfDay: true, documentRequired: "never",
    minDaysPerRequest: 0.5, accrualType: "upfront", annualAllocation: 0,
    encashmentAllowed: false, color: "#6B7280", isActive: true,
  },
];

interface StoredPolicy extends Omit<LeavePolicy, "allocations" | "employeeCount"> {
  allocations: { leaveTypeId: string; daysOverride?: number }[];
}

const DEFAULT_POLICIES: StoredPolicy[] = [
  {
    id: "lp_standard", name: "Standard Policy",
    description: "Applies to all full-time employees.",
    allocations: [
      { leaveTypeId: "lt_annual" }, { leaveTypeId: "lt_sick" }, { leaveTypeId: "lt_casual" },
      { leaveTypeId: "lt_maternity" }, { leaveTypeId: "lt_paternity" }, { leaveTypeId: "lt_lop" },
    ],
    eligibility: { employmentTypes: ["full_time"] },
    isDefault: true,
  },
  {
    id: "lp_intern", name: "Intern & Contract Policy",
    description: "Reduced allocation for interns and contractors.",
    allocations: [
      { leaveTypeId: "lt_casual", daysOverride: 6 },
      { leaveTypeId: "lt_sick", daysOverride: 6 },
      { leaveTypeId: "lt_lop" },
    ],
    eligibility: { employmentTypes: ["intern", "contract", "part_time"] },
    isDefault: false,
  },
];

function daysFromNow(n: number): Date {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + n);
  return d;
}

interface StoredRequest extends Omit<LeaveRequest, "employee" | "leaveType" | "approvals"> {
  approvals: Omit<LeaveApproval, "approver">[];
}

function seedRequests(employees: Employee[]): StoredRequest[] {
  if (!employees.length) return [];
  const pick = (i: number) => employees[i % employees.length];
  const mk = (
    i: number,
    leaveTypeId: string,
    startOffset: number,
    len: number,
    status: LeaveRequestStatus,
    reason: string,
    twoLevel = false,
  ): StoredRequest => {
    const e = pick(i);
    const start = daysFromNow(startOffset);
    const end = daysFromNow(startOffset + len - 1);
    return {
      id: uid("lr_"),
      employeeId: e.id,
      employeeName: `${e.firstName} ${e.lastName}`,
      departmentId: e.departmentId,
      leaveTypeId,
      startDate: start,
      endDate: end,
      isHalfDay: false,
      workingDays: len,
      reason,
      status,
      appliedAt: daysFromNow(startOffset - 7),
      approvals:
        status === "approved" || status === "rejected"
          ? [{
              id: uid("la_"),
              requestId: "",
              level: "manager",
              approverId: e.reportingManagerId ?? "mgr",
              approverName: "Reporting Manager",
              action: status === "approved" ? "approved" : "rejected",
              comment: status === "approved" ? "Approved — enjoy your break." : "Team capacity is tight that week.",
              actionAt: daysFromNow(startOffset - 5),
            }]
          : [],
      twoLevel,
    };
  };

  return [
    mk(0, "lt_annual", 6, 5, "pending", "Family trip to Coorg.", true),
    mk(1, "lt_sick", -2, 2, "pending", "Viral fever, doctor advised rest."),
    mk(2, "lt_casual", 3, 1, "pending", "House shifting."),
    mk(3, "lt_annual", 12, 3, "pending", "Wedding in the family.", true),
    mk(4, "lt_annual", -20, 4, "approved", "Diwali break."),
    mk(5, "lt_sick", -35, 1, "approved", "Migraine."),
    mk(6, "lt_casual", -12, 2, "approved", "Personal errands."),
    mk(7, "lt_annual", -60, 6, "rejected", "Long vacation."),
    mk(8, "lt_annual", 1, 2, "approved", "Short getaway."),
    mk(9, "lt_casual", 0, 1, "approved", "Personal work."),
    mk(10, "lt_sick", 0, 1, "approved", "Recovering from flu."),
    mk(11, "lt_annual", 20, 5, "pending", "Trekking in Himachal."),
  ];
}

let seeded = false;
async function ensureSeed(): Promise<Employee[]> {
  const res = await listEmployees();
  const employees = res.data ?? [];
  if (typeof window === "undefined") return employees;
  if (!window.localStorage.getItem(TYPES_KEY)) write(TYPES_KEY, DEFAULT_TYPES);
  if (!window.localStorage.getItem(POLICIES_KEY)) write(POLICIES_KEY, DEFAULT_POLICIES);
  if (!window.localStorage.getItem(REQUESTS_KEY)) write(REQUESTS_KEY, seedRequests(employees));
  if (!window.localStorage.getItem(ADJUSTMENTS_KEY)) write(ADJUSTMENTS_KEY, []);
  seeded = true;
  return employees;
}

// ───────────────────────── helpers ─────────────────────────

function rawTypes(): LeaveType[] {
  return read<LeaveType[]>(TYPES_KEY, DEFAULT_TYPES);
}
function rawPolicies(): StoredPolicy[] {
  return read<StoredPolicy[]>(POLICIES_KEY, DEFAULT_POLICIES);
}
function rawRequests(): StoredRequest[] {
  return read<StoredRequest[]>(REQUESTS_KEY, []);
}
function rawAdjustments(): LeaveAdjustment[] {
  return read<LeaveAdjustment[]>(ADJUSTMENTS_KEY, []);
}
function assignments(): Record<string, string> {
  return read<Record<string, string>>(ASSIGN_KEY, {});
}

function hydrateRequest(r: StoredRequest, employees: Employee[], types: LeaveType[]): LeaveRequest {
  const emp = employees.find((e) => e.id === r.employeeId) ?? null;
  const lt = types.find((t) => t.id === r.leaveTypeId) ?? types[0];
  return {
    ...r,
    employee: emp,
    leaveType: lt,
    approvals: r.approvals.map((a) => ({
      ...a,
      approver: employees.find((e) => e.id === a.approverId) ?? null,
    })),
  };
}

function hydratePolicy(p: StoredPolicy, types: LeaveType[], employees: Employee[]): LeavePolicy {
  const assigned = assignments();
  const count = employees.filter((e) => resolvePolicyId(e, assigned) === p.id).length;
  return {
    ...p,
    allocations: p.allocations
      .map((a) => {
        const lt = types.find((t) => t.id === a.leaveTypeId);
        return lt ? { leaveTypeId: a.leaveTypeId, leaveType: lt, daysOverride: a.daysOverride } : null;
      })
      .filter((a): a is NonNullable<typeof a> => a !== null),
    employeeCount: count,
  };
}

function resolvePolicyId(employee: Employee, assigned: Record<string, string>): string {
  if (assigned[employee.id]) return assigned[employee.id];
  const policies = rawPolicies();
  const match = policies.find(
    (p) => !p.isDefault && p.eligibility.employmentTypes?.includes(employee.employmentType),
  );
  if (match) return match.id;
  return policies.find((p) => p.isDefault)?.id ?? policies[0]?.id ?? "";
}

function monthsElapsed(year: number): number {
  const now = new Date();
  if (now.getFullYear() > year) return 12;
  if (now.getFullYear() < year) return 0;
  return now.getMonth() + 1;
}

function accruedFor(type: LeaveType, allocated: number, year: number): number {
  const m = monthsElapsed(year);
  switch (type.accrualType) {
    case "monthly":
      return Math.round((allocated / 12) * m * 2) / 2;
    case "quarterly":
      return Math.round((allocated / 4) * Math.ceil(m / 3) * 2) / 2;
    case "on_service_completion":
      return allocated;
    case "upfront":
    default:
      return allocated;
  }
}

function computeBalances(
  employee: Employee,
  year: number,
  types: LeaveType[],
  requests: StoredRequest[],
  adjustments: LeaveAdjustment[],
): LeaveBalance[] {
  const policy = rawPolicies().find((p) => p.id === resolvePolicyId(employee, assignments()));
  const allocs = policy?.allocations ?? [];
  return allocs
    .map((a) => {
      const lt = types.find((t) => t.id === a.leaveTypeId);
      if (!lt || !lt.isActive) return null;
      if (lt.applicableGender !== "all" && employee.gender && employee.gender !== lt.applicableGender) return null;
      const allocated = a.daysOverride ?? lt.annualAllocation;
      const mine = requests.filter(
        (r) => r.employeeId === employee.id && r.leaveTypeId === lt.id && r.startDate.getFullYear() === year,
      );
      const used = mine
        .filter((r) => r.status === "approved" || r.status === "auto_approved")
        .reduce((s, r) => s + r.workingDays, 0);
      const pending = mine.filter((r) => r.status === "pending").reduce((s, r) => s + r.workingDays, 0);
      const adj = adjustments
        .filter((x) => x.employeeId === employee.id && x.leaveTypeId === lt.id)
        .reduce((s, x) => s + x.adjustment, 0);
      const carried = lt.carryForwardMax ? Math.min(lt.carryForwardMax, 3) : 0;
      const accrued = accruedFor(lt, allocated, year) + adj;
      return {
        employeeId: employee.id,
        leaveTypeId: lt.id,
        leaveType: lt,
        year,
        allocated,
        accrued,
        used,
        pending,
        carried,
        encashed: 0,
        available: Math.round((accrued + carried - used - pending) * 2) / 2,
      } satisfies LeaveBalance;
    })
    .filter((b): b is LeaveBalance => b !== null);
}

async function calendarContext(): Promise<{ nonWorkingDays: number[]; holidays: Date[] }> {
  const [cal, hol, nat] = await Promise.all([
    settingsApi.getWorkCalendar(),
    settingsApi.listCompanyHolidays(),
    settingsApi.getNationalHolidays("IN"),
  ]);
  const working = new Set(cal.data?.workingDays ?? [1, 2, 3, 4, 5]);
  const nonWorkingDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !working.has(d));
  const holidays = [
    ...(hol.data ?? []).map((h) => new Date(`${h.date}T00:00:00`)),
    ...(nat.data ?? []).filter((h) => h.observed).map((h) => new Date(`${h.date}T00:00:00`)),
  ].filter((d) => !Number.isNaN(d.getTime()));
  return { nonWorkingDays, holidays };
}

// ───────────────────────── public API ─────────────────────────

export const leaveApi = {
  async getCalendarContext() {
    return calendarContext();
  },

  async listLeaveTypes(includeInactive = true): Promise<ApiResponse<LeaveType[]>> {
    await ensureSeed();
    const list = rawTypes().filter((t) => includeInactive || t.isActive);
    return delay(ok(list));
  },

  async upsertLeaveType(input: Omit<LeaveType, "id"> & { id?: string }): Promise<ApiResponse<LeaveType>> {
    await ensureSeed();
    const list = rawTypes();
    if (list.some((t) => t.code.toLowerCase() === input.code.toLowerCase() && t.id !== input.id)) {
      return fail<LeaveType>("A leave type with this code already exists.", "duplicate_code");
    }
    if (input.id) {
      const next = list.map((t) => (t.id === input.id ? { ...t, ...input, id: t.id } : t));
      write(TYPES_KEY, next);
      return delay(ok(next.find((t) => t.id === input.id)!));
    }
    const created: LeaveType = { ...input, id: uid("lt_") };
    write(TYPES_KEY, [...list, created]);
    return delay(ok(created));
  },

  async setLeaveTypeActive(id: string, isActive: boolean): Promise<ApiResponse<true>> {
    write(TYPES_KEY, rawTypes().map((t) => (t.id === id ? { ...t, isActive } : t)));
    return delay(ok(true as const), 150);
  },

  async deleteLeaveType(id: string): Promise<ApiResponse<true>> {
    await ensureSeed();
    const inUse = rawRequests().some((r) => r.leaveTypeId === id);
    if (inUse) return fail<true>("This leave type is used by existing requests. Deactivate it instead.", "in_use");
    write(TYPES_KEY, rawTypes().filter((t) => t.id !== id));
    write(POLICIES_KEY, rawPolicies().map((p) => ({ ...p, allocations: p.allocations.filter((a) => a.leaveTypeId !== id) })));
    return delay(ok(true as const));
  },

  async listPolicies(): Promise<ApiResponse<LeavePolicy[]>> {
    const employees = await ensureSeed();
    const types = rawTypes();
    return delay(ok(rawPolicies().map((p) => hydratePolicy(p, types, employees))));
  },

  async upsertPolicy(input: {
    id?: string;
    name: string;
    description?: string;
    allocations: { leaveTypeId: string; daysOverride?: number }[];
    eligibility: LeavePolicy["eligibility"];
    isDefault?: boolean;
  }): Promise<ApiResponse<true>> {
    await ensureSeed();
    const list = rawPolicies();
    if (input.id) {
      write(POLICIES_KEY, list.map((p) => (p.id === input.id ? { ...p, ...input, id: p.id, isDefault: input.isDefault ?? p.isDefault } : p)));
    } else {
      write(POLICIES_KEY, [...list, { ...input, id: uid("lp_"), isDefault: input.isDefault ?? false }]);
    }
    return delay(ok(true as const));
  },

  async setDefaultPolicy(id: string): Promise<ApiResponse<true>> {
    write(POLICIES_KEY, rawPolicies().map((p) => ({ ...p, isDefault: p.id === id })));
    return delay(ok(true as const), 150);
  },

  async deletePolicy(id: string): Promise<ApiResponse<true>> {
    const list = rawPolicies();
    const target = list.find((p) => p.id === id);
    if (target?.isDefault) return fail<true>("The default policy cannot be deleted.", "is_default");
    write(POLICIES_KEY, list.filter((p) => p.id !== id));
    return delay(ok(true as const));
  },

  async assignPolicy(employeeId: string, policyId: string): Promise<ApiResponse<true>> {
    write(ASSIGN_KEY, { ...assignments(), [employeeId]: policyId });
    return delay(ok(true as const), 150);
  },

  async getPolicyForEmployee(employeeId: string): Promise<ApiResponse<LeavePolicy | null>> {
    const employees = await ensureSeed();
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return ok(null);
    const p = rawPolicies().find((x) => x.id === resolvePolicyId(emp, assignments()));
    return delay(ok(p ? hydratePolicy(p, rawTypes(), employees) : null));
  },

  async listBalances(employeeId: string, year = new Date().getFullYear()): Promise<ApiResponse<LeaveBalance[]>> {
    const employees = await ensureSeed();
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return delay(ok([] as LeaveBalance[]));
    return delay(ok(computeBalances(emp, year, rawTypes(), rawRequests(), rawAdjustments())));
  },

  async listRequests(filters: {
    employeeId?: string;
    managerId?: string;
    statuses?: LeaveRequestStatus[];
    leaveTypeId?: string;
    departmentId?: string;
    from?: Date;
    to?: Date;
    q?: string;
  } = {}): Promise<ApiResponse<LeaveRequest[]>> {
    const employees = await ensureSeed();
    const types = rawTypes();
    let list = rawRequests().map((r) => hydrateRequest(r, employees, types));
    if (filters.employeeId) list = list.filter((r) => r.employeeId === filters.employeeId);
    if (filters.managerId) {
      list = list.filter((r) => r.employee?.reportingManagerId === filters.managerId);
    }
    if (filters.statuses?.length) list = list.filter((r) => filters.statuses!.includes(r.status));
    if (filters.leaveTypeId) list = list.filter((r) => r.leaveTypeId === filters.leaveTypeId);
    if (filters.departmentId) list = list.filter((r) => r.departmentId === filters.departmentId);
    if (filters.from && filters.to) {
      list = list.filter((r) => overlaps(r.startDate, r.endDate, filters.from!, filters.to!));
    }
    if (filters.q) {
      const q = filters.q.toLowerCase();
      list = list.filter((r) => r.employeeName.toLowerCase().includes(q) || (r.reason ?? "").toLowerCase().includes(q));
    }
    list.sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());
    return delay(ok(list));
  },

  async getRequest(id: string): Promise<ApiResponse<LeaveRequest>> {
    const employees = await ensureSeed();
    const found = rawRequests().find((r) => r.id === id);
    if (!found) return fail<LeaveRequest>("Request not found", "not_found");
    return delay(ok(hydrateRequest(found, employees, rawTypes())));
  },

  /** Overlap check against the employee's own pending/approved leave. */
  async checkOverlap(employeeId: string, start: Date, end: Date, excludeId?: string): Promise<LeaveRequest[]> {
    const employees = await ensureSeed();
    return rawRequests()
      .filter((r) => r.employeeId === employeeId && r.id !== excludeId)
      .filter((r) => r.status === "pending" || r.status === "approved" || r.status === "auto_approved")
      .filter((r) => overlaps(r.startDate, r.endDate, start, end))
      .map((r) => hydrateRequest(r, employees, rawTypes()));
  },

  async createRequest(input: {
    employeeId: string;
    leaveTypeId: string;
    startDate: Date;
    endDate: Date;
    isHalfDay: boolean;
    halfDayPeriod?: LeaveRequest["halfDayPeriod"];
    reason?: string;
    documentName?: string;
    status?: "draft" | "pending";
  }): Promise<ApiResponse<LeaveRequest>> {
    const employees = await ensureSeed();
    const emp = employees.find((e) => e.id === input.employeeId);
    if (!emp) return fail<LeaveRequest>("Employee not found", "not_found");
    const types = rawTypes();
    const lt = types.find((t) => t.id === input.leaveTypeId);
    if (!lt) return fail<LeaveRequest>("Leave type not found", "not_found");

    const clash = await this.checkOverlap(emp.id, input.startDate, input.endDate);
    if (clash.length) {
      return fail<LeaveRequest>("You already have leave in this date range.", "overlap");
    }

    const { nonWorkingDays, holidays } = await calendarContext();
    const workingDays = calculateWorkingDays(input.startDate, input.endDate, nonWorkingDays, holidays, input.isHalfDay);
    if (workingDays <= 0) {
      return fail<LeaveRequest>("The selected range contains no working days.", "no_working_days");
    }
    if (workingDays < lt.minDaysPerRequest) {
      return fail<LeaveRequest>(`${lt.name} requires at least ${lt.minDaysPerRequest} day(s).`, "min_days");
    }
    if (lt.maxDaysPerRequest && workingDays > lt.maxDaysPerRequest) {
      return fail<LeaveRequest>(`${lt.name} allows a maximum of ${lt.maxDaysPerRequest} days per request.`, "max_days");
    }

    const balances = computeBalances(emp, input.startDate.getFullYear(), types, rawRequests(), rawAdjustments());
    const bal = balances.find((b) => b.leaveTypeId === lt.id);
    if (lt.category !== "loss_of_pay" && bal && workingDays > bal.available) {
      return fail<LeaveRequest>(
        `Insufficient balance — you have ${bal.available} day(s) of ${lt.name} available.`,
        "insufficient_balance",
      );
    }

    const twoLevel = workingDays > 3;
    const record: StoredRequest = {
      id: uid("lr_"),
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      departmentId: emp.departmentId,
      leaveTypeId: lt.id,
      startDate: startOfDay(input.startDate),
      endDate: startOfDay(input.endDate),
      isHalfDay: input.isHalfDay,
      halfDayPeriod: input.halfDayPeriod,
      workingDays,
      reason: input.reason,
      documentName: input.documentName,
      status: input.status ?? "pending",
      appliedAt: new Date(),
      approvals: [],
      twoLevel,
    };
    write(REQUESTS_KEY, [record, ...rawRequests()]);
    return delay(ok(hydrateRequest(record, employees, types)));
  },

  async cancelRequest(id: string, reason?: string): Promise<ApiResponse<true>> {
    const list = rawRequests();
    const target = list.find((r) => r.id === id);
    if (!target) return fail<true>("Request not found", "not_found");
    if (target.status === "approved" && startOfDay(target.startDate).getTime() < startOfDay(new Date()).getTime()) {
      return fail<true>("Leave that has already started cannot be cancelled.", "already_started");
    }
    write(
      REQUESTS_KEY,
      list.map((r) => (r.id === id ? { ...r, status: "cancelled" as const, cancelledAt: new Date(), cancelReason: reason } : r)),
    );
    return delay(ok(true as const));
  },

  async actOnRequest(input: {
    id: string;
    level: "manager" | "hr_admin";
    action: "approved" | "rejected";
    approverId: string;
    approverName: string;
    comment?: string;
  }): Promise<ApiResponse<LeaveRequest>> {
    const employees = await ensureSeed();
    const list = rawRequests();
    const target = list.find((r) => r.id === input.id);
    if (!target) return fail<LeaveRequest>("Request not found", "not_found");
    if (input.action === "rejected" && !input.comment?.trim()) {
      return fail<LeaveRequest>("A comment is required when rejecting a request.", "comment_required");
    }

    const approval: Omit<LeaveApproval, "approver"> = {
      id: uid("la_"),
      requestId: target.id,
      level: input.level,
      approverId: input.approverId,
      approverName: input.approverName,
      action: input.action,
      comment: input.comment,
      actionAt: new Date(),
    };
    const approvals = [...target.approvals, approval];

    let status: LeaveRequestStatus = target.status;
    if (input.action === "rejected") status = "rejected";
    else if (!target.twoLevel) status = "approved";
    else status = approvals.filter((a) => a.action === "approved").length >= 2 ? "approved" : "pending";

    const next = { ...target, approvals, status };
    write(REQUESTS_KEY, list.map((r) => (r.id === input.id ? next : r)));
    return delay(ok(hydrateRequest(next, employees, rawTypes())));
  },

  async bulkAct(ids: string[], input: { level: "manager" | "hr_admin"; action: "approved" | "rejected"; approverId: string; approverName: string; comment?: string }): Promise<ApiResponse<number>> {
    let n = 0;
    for (const id of ids) {
      const r = await this.actOnRequest({ id, ...input });
      if (r.data) n += 1;
    }
    return ok(n);
  },

  async overrideDecision(id: string, action: "approved" | "rejected", actorName: string, comment: string): Promise<ApiResponse<true>> {
    const list = rawRequests();
    write(
      REQUESTS_KEY,
      list.map((r) =>
        r.id === id
          ? {
              ...r,
              status: action,
              approvals: [
                ...r.approvals,
                {
                  id: uid("la_"), requestId: r.id, level: "hr_admin" as const,
                  approverId: "hr", approverName: actorName, action,
                  comment: `HR override — ${comment}`, actionAt: new Date(),
                },
              ],
            }
          : r,
      ),
    );
    return delay(ok(true as const));
  },

  async listAdjustments(employeeId?: string): Promise<ApiResponse<LeaveAdjustment[]>> {
    await ensureSeed();
    const list = rawAdjustments().filter((a) => !employeeId || a.employeeId === employeeId);
    return delay(ok(list.sort((a, b) => b.adjustedAt.getTime() - a.adjustedAt.getTime())));
  },

  async adjustBalance(input: { employeeId: string; leaveTypeId: string; adjustment: number; reason: string; adjustedBy: string }): Promise<ApiResponse<true>> {
    if (!input.reason.trim()) return fail<true>("A reason is required for balance adjustments.", "reason_required");
    const record: LeaveAdjustment = { ...input, id: uid("ladj_"), adjustedAt: new Date() };
    write(ADJUSTMENTS_KEY, [record, ...rawAdjustments()]);
    return delay(ok(true as const));
  },

  /** Approved leave for everybody in a date window — used by calendars. */
  async listTeamLeaves(from: Date, to: Date, opts: { departmentId?: string; managerId?: string } = {}): Promise<ApiResponse<TeamLeaveEntry[]>> {
    const employees = await ensureSeed();
    const types = rawTypes();
    const entries = rawRequests()
      .filter((r) => r.status === "approved" || r.status === "auto_approved" || r.status === "pending")
      .filter((r) => overlaps(r.startDate, r.endDate, from, to))
      .map((r) => hydrateRequest(r, employees, types))
      .filter((r) => (!opts.departmentId || r.departmentId === opts.departmentId))
      .filter((r) => (!opts.managerId || r.employee?.reportingManagerId === opts.managerId))
      .map<TeamLeaveEntry>((r) => ({
        employeeId: r.employeeId,
        employeeName: r.employeeName,
        leaveType: r.leaveType,
        startDate: r.startDate,
        endDate: r.endDate,
        isHalfDay: r.isHalfDay,
      }));
    return delay(ok(entries), 120);
  },

  async getStats(): Promise<ApiResponse<{ pending: number; onLeaveToday: number; upcoming: number; avgApprovalHours: number }>> {
    const employees = await ensureSeed();
    const list = rawRequests().map((r) => hydrateRequest(r, employees, rawTypes()));
    const today = startOfDay(new Date());
    const pending = list.filter((r) => r.status === "pending").length;
    const onLeaveToday = list.filter(
      (r) => (r.status === "approved" || r.status === "auto_approved") && overlaps(r.startDate, r.endDate, today, today),
    ).length;
    const upcoming = list.filter((r) => r.status === "approved" && r.startDate.getTime() > today.getTime()).length;
    return delay(ok({ pending, onLeaveToday, upcoming, avgApprovalHours: 19 }), 120);
  },

  toKey,
  isSeeded: () => seeded,
};
