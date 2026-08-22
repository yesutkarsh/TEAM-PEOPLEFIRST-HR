/**
 * Reports & Analytics mock API (Phase 10). Browser-storage backed — no backend.
 * Derives numbers from the existing mock modules where feasible; otherwise
 * falls back to plausible constants.
 */
import type { ApiResponse } from "../types/api";
import type {
  CustomReportConfig,
  ExecutiveKpi,
  NlReportQuery,
  ReportChartDataPoint,
  ReportDataSource,
  ReportFilter,
  ReportRow,
  SavedReport,
} from "../types/reports";
import { delay, fail, ok, uid } from "./client";
import { listEmployees } from "./employees";
import { attendanceApi } from "./attendance";
import { leaveApi } from "./leave";
import { payrollApi } from "./payroll";
import { performanceApi } from "./performance";
import { essApi } from "./ess";
import { settingsApi } from "./settings";
import type { Employee } from "../types/employee";

const SAVED_KEY = "hrms.reports.saved";
const SEEDED_KEY = "hrms.reports.saved.seeded";

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

function nowIso() {
  return new Date().toISOString();
}

// ───────────────────────── executive KPIs ─────────────────────────

export async function getExecutiveKpis(): Promise<ApiResponse<ExecutiveKpi[]>> {
  const empsRes = await listEmployees();
  const employees = empsRes.data ?? [];
  const active = employees.filter((e) => e.employmentStatus === "active" || e.employmentStatus === "probation" || e.employmentStatus === "notice_period");

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const leftLast12m = employees.filter(
    (e) => e.employmentStatus === "inactive" && new Date(e.updatedAt) >= twelveMonthsAgo,
  ).length;
  const attritionRate = active.length ? Math.round((leftLast12m / (active.length + leftLast12m)) * 1000) / 10 : 0;

  let avgAttendance = 96.2;
  try {
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const recs = (await attendanceApi.listRecords({ from: from.toISOString().slice(0, 10) })).data ?? [];
    const relevant = recs.filter((r) => !["holiday", "week_off"].includes(r.status));
    const present = relevant.filter((r) => ["present", "late", "half_day"].includes(r.status)).length;
    avgAttendance = relevant.length ? Math.round((present / relevant.length) * 1000) / 10 : avgAttendance;
  } catch {
    // keep fallback
  }

  let lastPayrollCost = 0;
  try {
    const runs = (await payrollApi.listRuns?.()) as ApiResponse<any[]> | undefined;
    const list = runs?.data ?? [];
    const latest = [...list].sort((a, b) => (b.month ?? "").localeCompare(a.month ?? ""))[0];
    lastPayrollCost = latest?.totalCost ?? latest?.totalNetPay ?? 0;
  } catch {
    // ignore
  }
  if (!lastPayrollCost) {
    lastPayrollCost = active.reduce((sum, e) => sum + (e.ctcAnnual ?? 0) / 12, 0);
  }

  let openTickets = 0;
  try {
    const tickets = (await essApi.listTickets()).data ?? [];
    openTickets = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;
  } catch {
    openTickets = 4;
  }

  let activePips = 0;
  try {
    const pips = (await performanceApi.listPips?.()) as ApiResponse<any[]> | undefined;
    activePips = (pips?.data ?? []).filter((p) => p.status === "active").length;
  } catch {
    activePips = 1;
  }

  const kpis: ExecutiveKpi[] = [
    { key: "headcount", label: "Total headcount", value: String(active.length), trend: `${employees.length} total incl. exited`, trendDir: "neutral" },
    { key: "attrition", label: "Attrition (12m)", value: `${attritionRate}%`, trend: `${leftLast12m} exits`, trendDir: attritionRate > 10 ? "down" : "up" },
    { key: "attendance", label: "Avg. attendance rate", value: `${avgAttendance}%`, trend: "Last 30 days", trendDir: avgAttendance >= 90 ? "up" : "down" },
    { key: "payroll_cost", label: "Last payroll cost", value: formatInr(lastPayrollCost), trend: "Most recent run", trendDir: "neutral" },
    { key: "helpdesk", label: "Open helpdesk tickets", value: String(openTickets), trend: openTickets > 5 ? "Needs attention" : "Within normal range", trendDir: openTickets > 5 ? "down" : "up" },
    { key: "pips", label: "Active PIPs", value: String(activePips), trend: "Performance improvement plans", trendDir: activePips > 0 ? "down" : "neutral" },
  ];
  return delay(ok(kpis));
}

function formatInr(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

// ───────────────────────── standard reports ─────────────────────────

export interface StandardReportChart {
  title: string;
  points: ReportChartDataPoint[];
  kind: "bar" | "line";
}

export interface StandardReport {
  title: string;
  description: string;
  charts: StandardReportChart[];
  columns: { key: string; label: string }[];
  rows: ReportRow[];
}

export const STANDARD_REPORT_SLUGS = [
  "headcount-attrition",
  "leave-utilization",
  "attendance-summary",
  "performance-distribution",
  "helpdesk-expense-summary",
] as const;
export type StandardReportSlug = (typeof STANDARD_REPORT_SLUGS)[number];

export const STANDARD_REPORT_META: Record<StandardReportSlug, { title: string; description: string }> = {
  "headcount-attrition": { title: "Headcount & Attrition", description: "Department-wise headcount and trailing attrition." },
  "leave-utilization": { title: "Leave Utilization", description: "Leave taken vs. allocated by leave type." },
  "attendance-summary": { title: "Attendance Summary", description: "Attendance status breakdown for the trailing 30 days." },
  "performance-distribution": { title: "Performance Distribution", description: "Calibrated rating distribution across the active cycle." },
  "helpdesk-expense-summary": { title: "Helpdesk & Expense Summary", description: "Ticket volumes by category and expense claims by status." },
};

async function departmentLabel(id: string): Promise<string> {
  const depts = (await settingsApi.listDepartments()).data ?? [];
  return depts.find((d) => d.id === id)?.name ?? id;
}

export async function getStandardReport(slug: string): Promise<ApiResponse<StandardReport>> {
  if (!STANDARD_REPORT_SLUGS.includes(slug as StandardReportSlug)) {
    return delay(fail<StandardReport>("Unknown report.", "not_found"));
  }
  const meta = STANDARD_REPORT_META[slug as StandardReportSlug];
  const employees = (await listEmployees()).data ?? [];
  const depts = (await settingsApi.listDepartments()).data ?? [];

  if (slug === "headcount-attrition") {
    const byDept = depts.map((d) => {
      const list = employees.filter((e) => e.departmentId === d.id);
      const active = list.filter((e) => e.employmentStatus !== "inactive");
      const exited = list.filter((e) => e.employmentStatus === "inactive");
      return { dept: d.name, active: active.length, exited: exited.length };
    }).filter((r) => r.active + r.exited > 0);
    return delay(ok({
      title: meta.title,
      description: meta.description,
      charts: [
        { title: "Active headcount by department", kind: "bar", points: byDept.map((r) => ({ label: r.dept, value: r.active })) },
        { title: "Exits by department", kind: "bar", points: byDept.map((r) => ({ label: r.dept, value: r.exited, color: "#DC2626" })) },
      ],
      columns: [
        { key: "dept", label: "Department" },
        { key: "active", label: "Active headcount" },
        { key: "exited", label: "Exits" },
      ],
      rows: byDept as unknown as ReportRow[],
    }));
  }

  if (slug === "leave-utilization") {
    const types = (await leaveApi.listLeaveTypes(false)).data ?? [];
    const rows: ReportRow[] = [];
    for (const lt of types) {
      let allocated = 0;
      let taken = 0;
      for (const e of employees.slice(0, 20)) {
        const balances = (await leaveApi.listBalances(e.id)).data ?? [];
        const b = balances.find((x) => x.leaveTypeId === lt.id);
        if (b) {
          allocated += b.allocated;
          taken += b.used ?? 0;
        }
      }
      rows.push({ leaveType: lt.name, allocated: Math.round(allocated), taken: Math.max(0, Math.round(taken)) });
    }
    return delay(ok({
      title: meta.title,
      description: meta.description,
      charts: [{ title: "Days taken by leave type", kind: "bar", points: rows.map((r) => ({ label: String(r.leaveType), value: Number(r.taken) })) }],
      columns: [
        { key: "leaveType", label: "Leave type" },
        { key: "allocated", label: "Allocated (days)" },
        { key: "taken", label: "Taken (days)" },
      ],
      rows,
    }));
  }

  if (slug === "attendance-summary") {
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const recs = (await attendanceApi.listRecords({ from: from.toISOString().slice(0, 10) })).data ?? [];
    const buckets: Record<string, number> = {};
    for (const r of recs) buckets[r.status] = (buckets[r.status] ?? 0) + 1;
    const rows = Object.entries(buckets).map(([status, count]) => ({ status, count }));
    return delay(ok({
      title: meta.title,
      description: meta.description,
      charts: [{ title: "Attendance status — last 30 days", kind: "bar", points: rows.map((r) => ({ label: r.status.replace(/_/g, " "), value: r.count })) }],
      columns: [
        { key: "status", label: "Status" },
        { key: "count", label: "Days" },
      ],
      rows,
    }));
  }

  if (slug === "performance-distribution") {
    const reviews = (await performanceApi.listReviews?.({})) as ApiResponse<any[]> | undefined;
    const list = reviews?.data ?? [];
    const buckets: Record<number, number> = {};
    for (const r of list) {
      const rating = Math.round(r.calibratedRating ?? r.managerReview?.overallRating ?? 0);
      if (!rating) continue;
      buckets[rating] = (buckets[rating] ?? 0) + 1;
    }
    const rows = Object.entries(buckets).map(([rating, count]) => ({ rating: Number(rating), count }));
    return delay(ok({
      title: meta.title,
      description: meta.description,
      charts: [{ title: "Calibrated rating distribution", kind: "bar", points: rows.map((r) => ({ label: `Rating ${r.rating}`, value: r.count })) }],
      columns: [
        { key: "rating", label: "Rating" },
        { key: "count", label: "Employees" },
      ],
      rows,
    }));
  }

  // helpdesk-expense-summary
  const tickets = (await essApi.listTickets()).data ?? [];
  const expenses = (await essApi.listExpenses()).data ?? [];
  const byCat: Record<string, number> = {};
  for (const t of tickets) byCat[t.category] = (byCat[t.category] ?? 0) + 1;
  const byExpStatus: Record<string, number> = {};
  for (const e of expenses) byExpStatus[e.status] = (byExpStatus[e.status] ?? 0) + e.amount;
  const rows: ReportRow[] = [
    ...Object.entries(byCat).map(([category, count]) => ({ type: "Ticket category", label: category, value: count })),
    ...Object.entries(byExpStatus).map(([status, amount]) => ({ type: "Expense amount", label: status, value: Math.round(amount) })),
  ];
  return delay(ok({
    title: meta.title,
    description: meta.description,
    charts: [
      { title: "Tickets by category", kind: "bar", points: Object.entries(byCat).map(([label, value]) => ({ label, value })) },
      { title: "Expense amount by status (₹)", kind: "bar", points: Object.entries(byExpStatus).map(([label, value]) => ({ label, value: Math.round(value) })) },
    ],
    columns: [
      { key: "type", label: "Metric" },
      { key: "label", label: "Breakdown" },
      { key: "value", label: "Value" },
    ],
    rows,
  }));
}

// ───────────────────────── custom report builder ─────────────────────────

export interface FieldDef {
  key: string;
  label: string;
}

const FIELDS_BY_SOURCE: Record<ReportDataSource, FieldDef[]> = {
  employees: [
    { key: "employeeCode", label: "Employee code" },
    { key: "name", label: "Name" },
    { key: "departmentId", label: "Department" },
    { key: "designationId", label: "Designation" },
    { key: "employmentType", label: "Employment type" },
    { key: "employmentStatus", label: "Status" },
    { key: "dateOfJoining", label: "Date of joining" },
    { key: "ctcAnnual", label: "Annual CTC" },
  ],
  leave: [
    { key: "employeeName", label: "Employee" },
    { key: "leaveType", label: "Leave type" },
    { key: "startDate", label: "Start date" },
    { key: "endDate", label: "End date" },
    { key: "days", label: "Days" },
    { key: "status", label: "Status" },
  ],
  attendance: [
    { key: "employeeName", label: "Employee" },
    { key: "date", label: "Date" },
    { key: "status", label: "Status" },
    { key: "workedMinutes", label: "Worked minutes" },
    { key: "lateMinutes", label: "Late minutes" },
  ],
  performance: [
    { key: "employeeId", label: "Employee" },
    { key: "cycleId", label: "Cycle" },
    { key: "status", label: "Review status" },
    { key: "calibratedRating", label: "Calibrated rating" },
  ],
  helpdesk: [
    { key: "code", label: "Ticket code" },
    { key: "subject", label: "Subject" },
    { key: "category", label: "Category" },
    { key: "priority", label: "Priority" },
    { key: "status", label: "Status" },
    { key: "raisedByName", label: "Raised by" },
  ],
  expenses: [
    { key: "code", label: "Claim code" },
    { key: "employeeName", label: "Employee" },
    { key: "category", label: "Category" },
    { key: "amount", label: "Amount" },
    { key: "status", label: "Status" },
    { key: "spentOn", label: "Spent on" },
  ],
};

export function fieldsForDataSource(source: ReportDataSource): FieldDef[] {
  return FIELDS_BY_SOURCE[source] ?? [];
}

export function filterFieldsForDataSource(source: ReportDataSource): FieldDef[] {
  return FIELDS_BY_SOURCE[source] ?? [];
}

export const DATA_SOURCE_LABELS: Record<ReportDataSource, string> = {
  employees: "Employees",
  leave: "Leave",
  attendance: "Attendance",
  performance: "Performance",
  helpdesk: "Helpdesk",
  expenses: "Expenses",
};

async function rowsForDataSource(source: ReportDataSource): Promise<ReportRow[]> {
  if (source === "employees") {
    const list = (await listEmployees()).data ?? [];
    return list.map((e) => ({
      employeeCode: e.employeeCode,
      name: `${e.firstName} ${e.lastName}`,
      departmentId: e.departmentId,
      designationId: e.designationId,
      employmentType: e.employmentType,
      employmentStatus: e.employmentStatus,
      dateOfJoining: e.dateOfJoining.slice(0, 10),
      ctcAnnual: e.ctcAnnual ?? 0,
    }));
  }
  if (source === "leave") {
    const list = (await leaveApi.listRequests({})).data ?? [];
    return list.map((r) => ({
      employeeName: r.employeeName,
      leaveType: r.leaveType?.name ?? r.leaveTypeId,
      startDate: String(r.startDate).slice(0, 10),
      endDate: String(r.endDate).slice(0, 10),
      days: r.workingDays ?? 0,
      status: r.status,
    }));
  }
  if (source === "attendance") {
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const list = (await attendanceApi.listRecords({ from: from.toISOString().slice(0, 10) })).data ?? [];
    return list.map((r) => ({
      employeeName: r.employeeName,
      date: r.date,
      status: r.status,
      workedMinutes: r.workedMinutes,
      lateMinutes: r.lateMinutes,
    }));
  }
  if (source === "performance") {
    const list = ((await performanceApi.listReviews?.({})) as ApiResponse<any[]> | undefined)?.data ?? [];
    return list.map((r) => ({
      employeeId: r.employeeId,
      cycleId: r.cycleId,
      status: r.status,
      calibratedRating: r.calibratedRating ?? "",
    }));
  }
  if (source === "helpdesk") {
    const list = (await essApi.listTickets()).data ?? [];
    return list.map((t) => ({
      code: t.code,
      subject: t.subject,
      category: t.category,
      priority: t.priority,
      status: t.status,
      raisedByName: t.raisedByName,
    }));
  }
  // expenses
  const list = (await essApi.listExpenses()).data ?? [];
  return list.map((c) => ({
    code: c.code,
    employeeName: c.employeeName,
    category: c.category,
    amount: c.amount,
    status: c.status,
    spentOn: c.spentOn,
  }));
}

function applyFilter(rows: ReportRow[], filter: ReportFilter): ReportRow[] {
  return rows.filter((row) => {
    const raw = row[filter.field];
    const val = raw === undefined || raw === null ? "" : raw;
    switch (filter.operator) {
      case "equals":
        return String(val).toLowerCase() === String(filter.value).toLowerCase();
      case "not_equals":
        return String(val).toLowerCase() !== String(filter.value).toLowerCase();
      case "contains":
        return String(val).toLowerCase().includes(String(filter.value).toLowerCase());
      case "greater_than":
        return Number(val) > Number(filter.value);
      case "less_than":
        return Number(val) < Number(filter.value);
      case "between": {
        const [lo, hi] = Array.isArray(filter.value) ? filter.value : String(filter.value).split(",");
        return Number(val) >= Number(lo) && Number(val) <= Number(hi);
      }
      case "in": {
        const list = Array.isArray(filter.value) ? filter.value : [filter.value];
        return list.map(String).map((s) => s.toLowerCase()).includes(String(val).toLowerCase());
      }
      default:
        return true;
    }
  });
}

export async function runCustomReport(config: CustomReportConfig): Promise<ApiResponse<{ columns: { key: string; label: string }[]; rows: ReportRow[] }>> {
  let rows = await rowsForDataSource(config.dataSource);
  for (const f of config.filters ?? []) rows = applyFilter(rows, f);

  if (config.sortBy) {
    const dir = config.sortDirection === "desc" ? -1 : 1;
    rows = [...rows].sort((a, b) => {
      const av = a[config.sortBy!];
      const bv = b[config.sortBy!];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
    });
  }

  const allFields = fieldsForDataSource(config.dataSource);
  const fieldKeys = config.fields?.length ? config.fields : allFields.map((f) => f.key);

  if (config.groupBy) {
    const groups = new Map<string, ReportRow[]>();
    for (const row of rows) {
      const key = String(row[config.groupBy] ?? "—");
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    const numericKeys = fieldKeys.filter((k) => k !== config.groupBy && rows.some((r) => typeof r[k] === "number"));
    const grouped: ReportRow[] = Array.from(groups.entries()).map(([key, list]) => {
      const out: ReportRow = { [config.groupBy!]: key, count: list.length };
      for (const nk of numericKeys) out[nk] = list.reduce((s, r) => s + (Number(r[nk]) || 0), 0);
      return out;
    });
    const columns = [{ key: config.groupBy, label: allFields.find((f) => f.key === config.groupBy)?.label ?? config.groupBy }, { key: "count", label: "Count" }, ...numericKeys.map((k) => ({ key: k, label: allFields.find((f) => f.key === k)?.label ?? k }))];
    return delay(ok({ columns, rows: grouped }));
  }

  const columns = fieldKeys.map((k) => ({ key: k, label: allFields.find((f) => f.key === k)?.label ?? k }));
  const projected = rows.map((r) => {
    const out: ReportRow = {};
    for (const k of fieldKeys) out[k] = r[k] ?? "";
    return out;
  });
  return delay(ok({ columns, rows: projected }));
}

// ───────────────────────── saved reports ─────────────────────────

function seedSavedReports() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(SEEDED_KEY) === "1") return;
  const seed: SavedReport[] = [
    {
      id: "sr_1",
      name: "Active engineering headcount",
      description: "Active employees in the Engineering department.",
      config: { dataSource: "employees", fields: ["employeeCode", "name", "designationId", "employmentStatus"], filters: [{ field: "departmentId", operator: "equals", value: "d_eng" }] },
      createdBy: "HR Admin",
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      lastRunAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: "sr_2",
      name: "High priority open tickets",
      description: "Helpdesk tickets that are open or in progress and high/urgent priority.",
      config: { dataSource: "helpdesk", fields: ["code", "subject", "priority", "status"], filters: [{ field: "status", operator: "in", value: ["open", "in_progress"] }] },
      createdBy: "HR Admin",
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
  ];
  write(SAVED_KEY, seed);
  window.localStorage.setItem(SEEDED_KEY, "1");
}

function ensureSeed() {
  seedSavedReports();
}

export async function listSavedReports(): Promise<ApiResponse<SavedReport[]>> {
  ensureSeed();
  const list = read<SavedReport[]>(SAVED_KEY, []);
  return delay(ok([...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))));
}

export async function getSavedReport(id: string): Promise<ApiResponse<SavedReport>> {
  ensureSeed();
  const found = read<SavedReport[]>(SAVED_KEY, []).find((r) => r.id === id);
  return delay(found ? ok(found) : fail<SavedReport>("Saved report not found.", "not_found"));
}

export async function saveReport(input: { name: string; description?: string; config: CustomReportConfig; createdBy?: string }): Promise<ApiResponse<SavedReport>> {
  ensureSeed();
  const list = read<SavedReport[]>(SAVED_KEY, []);
  const created: SavedReport = {
    id: uid("sr_"),
    name: input.name,
    description: input.description,
    config: input.config,
    createdBy: input.createdBy ?? "HR Admin",
    createdAt: nowIso(),
  };
  write(SAVED_KEY, [created, ...list]);
  return delay(ok(created));
}

export async function updateReport(id: string, patch: Partial<Pick<SavedReport, "name" | "description" | "config">>): Promise<ApiResponse<SavedReport>> {
  ensureSeed();
  const list = read<SavedReport[]>(SAVED_KEY, []);
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return delay(fail<SavedReport>("Saved report not found.", "not_found"));
  list[idx] = { ...list[idx], ...patch };
  write(SAVED_KEY, list);
  return delay(ok(list[idx]));
}

export async function touchReportRun(id: string): Promise<void> {
  ensureSeed();
  const list = read<SavedReport[]>(SAVED_KEY, []);
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], lastRunAt: nowIso() };
  write(SAVED_KEY, list);
}

export async function deleteReport(id: string): Promise<ApiResponse<true>> {
  ensureSeed();
  const list = read<SavedReport[]>(SAVED_KEY, []);
  write(SAVED_KEY, list.filter((r) => r.id !== id));
  return delay(ok(true as const));
}

// ───────────────────────── natural-language queries ─────────────────────────

const OUT_OF_SCOPE_TERMS = ["competitor", "salaries at other companies", "stock price", "weather"];

export async function interpretNlQuery(text: string): Promise<ApiResponse<NlReportQuery>> {
  const q = text.trim().toLowerCase();
  const id = uid("nlq_");

  if (OUT_OF_SCOPE_TERMS.some((t) => q.includes(t))) {
    return delay(ok({
      id,
      queryText: text,
      interpretedAs: "",
      generatedConfig: null,
      needsClarification: false,
      declineMessage: "I can only report on data inside this HRMS — employees, leave, attendance, performance, helpdesk and expenses. That question is outside what I have access to.",
      resultCount: 0,
    }));
  }

  // Ambiguous — bare category words without enough qualifiers.
  const bareWords = ["leave", "attendance", "performance", "helpdesk", "expenses", "employees"];
  if (bareWords.includes(q)) {
    const optionsByWord: Record<string, string[]> = {
      leave: ["Leave requests pending approval", "Leave taken this year by type", "Team leave calendar for this month"],
      attendance: ["Attendance summary for the last 30 days", "Late arrivals this month", "Employees with the most absences"],
      performance: ["Calibrated rating distribution", "Employees on a PIP", "Goal completion by department"],
      helpdesk: ["Open tickets by category", "Tickets raised this month", "Average ticket resolution time"],
      expenses: ["Expense claims pending approval", "Expense amount by category", "Reimbursed expenses this quarter"],
      employees: ["Headcount by department", "New joiners this quarter", "Employees by employment type"],
    };
    return delay(ok({
      id,
      queryText: text,
      interpretedAs: "",
      generatedConfig: null,
      needsClarification: true,
      clarificationQuestion: `"${text}" could mean a few things. Which report did you mean?`,
      clarificationOptions: optionsByWord[q],
      resultCount: 0,
    }));
  }

  // Confident mappings — keyword based.
  const mapping: { test: RegExp; source: ReportDataSource; fields: string[]; filters: ReportFilter[]; interpretedAs: string }[] = [
    { test: /engineer/i, source: "employees", fields: ["employeeCode", "name", "designationId", "employmentStatus"], filters: [{ field: "departmentId", operator: "equals", value: "d_eng" }], interpretedAs: "Employees in the Engineering department" },
    { test: /open ticket|helpdesk/i, source: "helpdesk", fields: ["code", "subject", "priority", "status"], filters: [{ field: "status", operator: "in", value: ["open", "in_progress"] }], interpretedAs: "Open and in-progress helpdesk tickets" },
    { test: /pending expense|expense/i, source: "expenses", fields: ["code", "employeeName", "category", "amount", "status"], filters: [{ field: "status", operator: "equals", value: "submitted" }], interpretedAs: "Expense claims pending approval" },
    { test: /pip|improvement plan/i, source: "performance", fields: ["employeeId", "status", "calibratedRating"], filters: [], interpretedAs: "Employees currently on a performance review cycle" },
    { test: /late|attendance/i, source: "attendance", fields: ["employeeName", "date", "status", "lateMinutes"], filters: [{ field: "status", operator: "equals", value: "late" }], interpretedAs: "Late attendance records in the last 30 days" },
    { test: /joiner|hired|new employee/i, source: "employees", fields: ["employeeCode", "name", "dateOfJoining", "departmentId"], filters: [], interpretedAs: "Employees by date of joining" },
    { test: /headcount/i, source: "employees", fields: ["employeeCode", "name", "departmentId", "employmentStatus"], filters: [], interpretedAs: "All employees with department and status" },
  ];

  const hit = mapping.find((m) => m.test.test(q));
  if (hit) {
    const config: CustomReportConfig = { dataSource: hit.source, fields: hit.fields, filters: hit.filters };
    const result = await runCustomReport(config);
    const resultCount = result.data?.rows.length ?? 0;
    return delay(ok({
      id,
      queryText: text,
      interpretedAs: hit.interpretedAs,
      generatedConfig: config,
      needsClarification: false,
      resultCount,
    }));
  }

  // Fallback: treat as ambiguous with generic suggestions.
  return delay(ok({
    id,
    queryText: text,
    interpretedAs: "",
    generatedConfig: null,
    needsClarification: true,
    clarificationQuestion: `I'm not sure which report "${text}" refers to. Did you mean one of these?`,
    clarificationOptions: ["Headcount by department", "Open helpdesk tickets", "Expense claims pending approval", "Attendance summary"],
    resultCount: 0,
  }));
}

// ───────────────────────── export ─────────────────────────

export type ExportFormat = "csv" | "excel" | "pdf";
export const EXPORT_LARGE_ROW_THRESHOLD = 5000;

function toCsvValue(v: string | number) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportReport(
  rows: ReportRow[],
  columns: { key: string; label: string }[],
  format: ExportFormat,
  filenameBase = "report",
): { rowCount: number; isLarge: boolean } {
  const rowCount = rows.length;
  const isLarge = rowCount > EXPORT_LARGE_ROW_THRESHOLD;

  if (typeof window === "undefined") return { rowCount, isLarge };

  if (format === "csv" || format === "excel") {
    const delimiter = format === "excel" ? "\t" : ",";
    const header = columns.map((c) => c.label).join(delimiter);
    const body = rows.map((r) => columns.map((c) => toCsvValue(r[c.key])).join(delimiter)).join("\n");
    const content = `${header}\n${body}`;
    const mime = format === "excel" ? "application/vnd.ms-excel" : "text/csv;charset=utf-8";
    const ext = format === "excel" ? "xls" : "csv";
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenameBase}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { rowCount, isLarge };
  }

  // pdf — print-friendly window
  const win = window.open("", "_blank", "width=900,height=700");
  if (win) {
    const headHtml = columns.map((c) => `<th>${c.label}</th>`).join("");
    const bodyHtml = rows.map((r) => `<tr>${columns.map((c) => `<td>${r[c.key] ?? ""}</td>`).join("")}</tr>`).join("");
    win.document.write(`<!doctype html><html><head><title>${filenameBase}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#0A0A0A;padding:24px;}
        table{border-collapse:collapse;width:100%;font-size:12px;}
        th,td{border:1px solid #E5E5E3;padding:6px 10px;text-align:left;}
        th{background:#FAFAF8;text-transform:uppercase;font-size:10px;letter-spacing:0.06em;}
      </style></head><body>
      <h2>${filenameBase.replace(/-/g, " ")}</h2>
      <table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }
  return { rowCount, isLarge };
}
