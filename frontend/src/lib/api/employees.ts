/** Employee CRUD against localStorage. Seeds demo employees on first read. */
import type { ApiResponse } from "../types/api";
import type {
  Employee,
  EmployeeDocument,
  EmployeeFilters,
  EmploymentStatus,
  TimelineEntry,
} from "../types/employee";
import { delay, fail, ok, uid } from "./client";

const KEY = "hrms.employees";
const SEEDED = "hrms.employees.seeded";

function read(): Employee[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Employee[]) : [];
  } catch {
    return [];
  }
}
function write(list: Employee[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

function nowIso() {
  return new Date().toISOString();
}

function defaultDocs(): EmployeeDocument[] {
  return [
    { id: uid("doc_"), type: "aadhaar", label: "Aadhaar Card", status: "pending" },
    { id: uid("doc_"), type: "pan", label: "PAN Card", status: "pending" },
    { id: uid("doc_"), type: "offer_letter", label: "Offer Letter", status: "pending" },
    { id: uid("doc_"), type: "appointment_letter", label: "Appointment Letter", status: "pending" },
    { id: uid("doc_"), type: "education_certificate", label: "Education Certificate", status: "pending" },
  ];
}

export function computeCompleteness(e: Employee): { pct: number; missing: string[] } {
  const checks: Array<[string, boolean]> = [
    ["First name", !!e.firstName],
    ["Last name", !!e.lastName],
    ["Work email", !!e.workEmail],
    ["Phone", !!e.phone],
    ["Date of birth", !!e.dateOfBirth],
    ["Gender", !!e.gender],
    ["Blood group", !!e.bloodGroup],
    ["Current address", !!e.currentAddress?.city],
    ["Permanent address", !!e.sameAddress || !!e.permanentAddress?.city],
    ["Emergency contact", !!e.emergencyContact?.name],
    ["Department", !!e.departmentId],
    ["Designation", !!e.designationId],
    ["Reporting manager", !!e.reportingManagerId],
    ["CTC", !!e.ctcAnnual],
    ["Bank account", !!e.bankAccountNumber],
    ["PAN number", !!e.panNumber],
    ["Aadhaar number", !!e.aadhaarNumber],
    ["Aadhaar document", e.documents.some((d) => d.type === "aadhaar" && d.status !== "pending")],
    ["PAN document", e.documents.some((d) => d.type === "pan" && d.status !== "pending")],
  ];
  const passed = checks.filter(([, v]) => v).length;
  const missing = checks.filter(([, v]) => !v).map(([k]) => k);
  return { pct: Math.round((passed / checks.length) * 100), missing };
}

function withMeta(e: Employee): Employee {
  const { pct } = computeCompleteness(e);
  return { ...e, profileCompleteness: pct };
}

function seed() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(SEEDED) === "1") return;
  const today = new Date();
  const isoBack = (days: number) => new Date(today.getTime() - days * 86400000).toISOString();
  const dobYears = (y: number) =>
    new Date(today.getFullYear() - y, today.getMonth(), today.getDate()).toISOString();

  const seedList: Employee[] = [
    mkSeed({
      code: "EMP-0001",
      first: "Maya",
      last: "Singh",
      dept: "d_eng",
      desig: "g_sse",
      type: "full_time",
      status: "active",
      role: "manager",
      mgr: undefined,
      joined: isoBack(900),
      dob: dobYears(34),
    }),
    mkSeed({
      code: "EMP-0002",
      first: "Theo",
      last: "Park",
      dept: "d_des",
      desig: "g_pd",
      type: "full_time",
      status: "active",
      role: "manager",
      joined: isoBack(720),
      dob: dobYears(31),
    }),
    mkSeed({
      code: "EMP-0003",
      first: "Jordan",
      last: "Reyes",
      dept: "d_ppl",
      desig: "g_sse",
      type: "full_time",
      status: "active",
      role: "hr_admin",
      joined: isoBack(640),
      dob: dobYears(29),
    }),
    mkSeed({
      code: "EMP-0004",
      first: "Riley",
      last: "Chen",
      dept: "d_sal",
      desig: "g_ae",
      type: "full_time",
      status: "active",
      role: "manager",
      joined: isoBack(500),
      dob: dobYears(36),
    }),
    mkSeed({
      code: "EMP-0005",
      first: "Aisha",
      last: "Khan",
      dept: "d_eng",
      desig: "g_se",
      type: "full_time",
      status: "active",
      role: "employee",
      mgr: "EMP-0001",
      joined: isoBack(420),
      dob: dobYears(27),
    }),
    mkSeed({
      code: "EMP-0006",
      first: "Liam",
      last: "Garcia",
      dept: "d_eng",
      desig: "g_se",
      type: "full_time",
      status: "probation",
      role: "employee",
      mgr: "EMP-0001",
      joined: isoBack(45),
      dob: dobYears(24),
    }),
    mkSeed({
      code: "EMP-0007",
      first: "Sofia",
      last: "Martins",
      dept: "d_des",
      desig: "g_pd",
      type: "full_time",
      status: "active",
      role: "employee",
      mgr: "EMP-0002",
      joined: isoBack(300),
      dob: dobYears(28),
    }),
    mkSeed({
      code: "EMP-0008",
      first: "Noah",
      last: "Patel",
      dept: "d_sal",
      desig: "g_ae",
      type: "full_time",
      status: "active",
      role: "employee",
      mgr: "EMP-0004",
      joined: isoBack(260),
      dob: dobYears(30),
    }),
    mkSeed({
      code: "EMP-0009",
      first: "Emma",
      last: "Wilson",
      dept: "d_ppl",
      desig: "g_se",
      type: "part_time",
      status: "active",
      role: "employee",
      mgr: "EMP-0003",
      joined: isoBack(180),
      dob: dobYears(26),
    }),
    mkSeed({
      code: "EMP-0010",
      first: "Aarav",
      last: "Mehta",
      dept: "d_eng",
      desig: "g_se",
      type: "contract",
      status: "notice_period",
      role: "employee",
      mgr: "EMP-0005",
      joined: isoBack(120),
      dob: dobYears(32),
    }),
    mkSeed({
      code: "EMP-0011",
      first: "Zara",
      last: "Lee",
      dept: "d_des",
      desig: "g_se",
      type: "intern",
      status: "active",
      role: "employee",
      mgr: "EMP-0002",
      joined: isoBack(30),
      dob: dobYears(22),
    }),
    mkSeed({
      code: "EMP-0012",
      first: "Marcus",
      last: "Bell",
      dept: "d_sal",
      desig: "g_ae",
      type: "full_time",
      status: "inactive",
      role: "employee",
      mgr: "EMP-0004",
      joined: isoBack(800),
      dob: dobYears(40),
    }),
  ];
  // Resolve manager codes to actual ids
  const byCode: Record<string, string> = {};
  seedList.forEach((e) => (byCode[e.employeeCode] = e.id));
  const resolved = seedList.map((e) =>
    withMeta({ ...e, reportingManagerId: e.reportingManagerId ? byCode[e.reportingManagerId] : undefined }),
  );
  write(resolved);
  window.localStorage.setItem(SEEDED, "1");
}

function mkSeed(o: {
  code: string;
  first: string;
  last: string;
  dept: string;
  desig: string;
  type: Employee["employmentType"];
  status: EmploymentStatus;
  role: Employee["role"];
  mgr?: string;
  joined: string;
  dob: string;
}): Employee {
  const id = uid("emp_");
  return {
    id,
    employeeCode: o.code,
    firstName: o.first,
    lastName: o.last,
    personalEmail: `${o.first.toLowerCase()}.${o.last.toLowerCase()}@personal.demo`,
    workEmail: `${o.first.toLowerCase()}.${o.last.toLowerCase()}@acme.demo`,
    phone: "+91 98000 00000",
    dateOfBirth: o.dob,
    gender: "prefer_not_to_say",
    bloodGroup: "O+",
    nationality: "Indian",
    currentAddress: { line1: "Demo Lane 12", city: "Bengaluru", state: "Karnataka", pincode: "560001", country: "India" },
    sameAddress: true,
    departmentId: o.dept,
    designationId: o.desig,
    employmentType: o.type,
    employmentStatus: o.status,
    dateOfJoining: o.joined,
    reportingManagerId: o.mgr,
    workLocation: "Bengaluru HQ",
    ctcAnnual: 1200000,
    bankName: "HDFC Bank",
    bankAccountNumber: "1234567890" + o.code.slice(-2),
    bankIfsc: "HDFC0000123",
    panNumber: "ABCDE" + o.code.slice(-4) + "F",
    aadhaarNumber: "1234 5678 " + o.code.slice(-4),
    role: o.role,
    documents: defaultDocs(),
    emergencyContact: { name: "Family Member", relationship: "Parent", phone: "+91 98000 00001" },
    timeline: [
      { id: uid("t_"), at: o.joined, actor: "System", message: "Employee onboarded." },
    ],
    createdAt: o.joined,
    updatedAt: nowIso(),
    profileCompleteness: 0,
  };
}

function ensureSeed() {
  if (typeof window === "undefined") return;
  seed();
}

// ────────────── public API ──────────────

export async function listEmployees(filters: EmployeeFilters = {}): Promise<ApiResponse<Employee[]>> {
  ensureSeed();
  let list = read();
  if (filters.q) {
    const q = filters.q.toLowerCase();
    list = list.filter(
      (e) =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        e.workEmail.toLowerCase().includes(q),
    );
  }
  if (filters.departmentId) list = list.filter((e) => e.departmentId === filters.departmentId);
  if (filters.designationId) list = list.filter((e) => e.designationId === filters.designationId);
  if (filters.types?.length) list = list.filter((e) => filters.types!.includes(e.employmentType));
  if (filters.statuses?.length) list = list.filter((e) => filters.statuses!.includes(e.employmentStatus));
  return delay(ok(list.map(withMeta)));
}

export async function getEmployee(id: string): Promise<ApiResponse<Employee>> {
  ensureSeed();
  const found = read().find((e) => e.id === id);
  if (!found) return delay(fail<Employee>("Employee not found", "not_found"));
  return delay(ok(withMeta(found)));
}

export async function nextEmployeeCode(): Promise<string> {
  ensureSeed();
  const list = read();
  const nums = list
    .map((e) => parseInt(e.employeeCode.replace(/^EMP-/, ""), 10))
    .filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return "EMP-" + String(next).padStart(4, "0");
}

export async function createEmployee(
  input: Omit<Employee, "id" | "createdAt" | "updatedAt" | "timeline" | "profileCompleteness" | "documents"> & {
    documents?: EmployeeDocument[];
  },
): Promise<ApiResponse<Employee>> {
  ensureSeed();
  const list = read();
  if (list.some((e) => e.workEmail.toLowerCase() === input.workEmail.toLowerCase())) {
    return delay(fail<Employee>("An employee with this work email already exists.", "duplicate"));
  }
  if (list.some((e) => e.employeeCode === input.employeeCode)) {
    return delay(fail<Employee>("Employee code already in use.", "duplicate"));
  }
  const created: Employee = withMeta({
    ...input,
    id: uid("emp_"),
    documents: input.documents?.length ? input.documents : defaultDocs(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    timeline: [{ id: uid("t_"), at: nowIso(), actor: "HR Admin", message: "Employee created." }],
    profileCompleteness: 0,
  });
  write([created, ...list]);
  return delay(ok(created));
}

export async function updateEmployee(
  id: string,
  patch: Partial<Employee>,
  actor = "HR Admin",
  summary = "Profile updated.",
): Promise<ApiResponse<Employee>> {
  ensureSeed();
  const list = read();
  const i = list.findIndex((e) => e.id === id);
  if (i < 0) return delay(fail<Employee>("Employee not found"));
  const entry: TimelineEntry = { id: uid("t_"), at: nowIso(), actor, message: summary };
  const merged: Employee = withMeta({
    ...list[i],
    ...patch,
    updatedAt: nowIso(),
    timeline: [entry, ...(list[i].timeline ?? [])].slice(0, 200),
  });
  list[i] = merged;
  write(list);
  return delay(ok(merged));
}

export async function setStatus(
  id: string,
  status: EmploymentStatus,
  note?: string,
): Promise<ApiResponse<Employee>> {
  return updateEmployee(id, { employmentStatus: status }, "HR Admin", `Status changed to ${status}${note ? " — " + note : ""}.`);
}

export async function updateDocument(
  id: string,
  docId: string,
  patch: Partial<EmployeeDocument>,
): Promise<ApiResponse<Employee>> {
  ensureSeed();
  const list = read();
  const i = list.findIndex((e) => e.id === id);
  if (i < 0) return delay(fail<Employee>("Employee not found"));
  const docs = list[i].documents.map((d) => (d.id === docId ? { ...d, ...patch } : d));
  return updateEmployee(id, { documents: docs }, "HR Admin", `Document "${docs.find((d) => d.id === docId)?.label}" updated.`);
}

export async function archiveEmployees(ids: string[]): Promise<ApiResponse<number>> {
  ensureSeed();
  const list = read().map((e) =>
    ids.includes(e.id) ? withMeta({ ...e, employmentStatus: "inactive", updatedAt: nowIso() }) : e,
  );
  write(list);
  return delay(ok(ids.length));
}

export function employeesToCsv(list: Employee[]): string {
  const header = [
    "Employee Code",
    "First Name",
    "Last Name",
    "Work Email",
    "Phone",
    "Department",
    "Designation",
    "Type",
    "Status",
    "Joined",
  ];
  const rows = list.map((e) =>
    [
      e.employeeCode,
      e.firstName,
      e.lastName,
      e.workEmail,
      e.phone,
      e.departmentId,
      e.designationId,
      e.employmentType,
      e.employmentStatus,
      e.dateOfJoining.slice(0, 10),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}