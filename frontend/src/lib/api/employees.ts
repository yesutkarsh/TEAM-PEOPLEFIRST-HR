/** Employee API Client connected to Next.js. */
import type { ApiResponse } from "../types/api";
import type {
  Employee,
  EmployeeDocument,
  EmployeeFilters,
  EmploymentStatus,
} from "../types/employee";
import { request, uid } from "./client";

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
    ["Aadhaar document", e.documents ? e.documents.some((d) => d.type === "aadhaar" && d.status !== "pending") : false],
    ["PAN document", e.documents ? e.documents.some((d) => d.type === "pan" && d.status !== "pending") : false],
  ];
  const passed = checks.filter(([, v]) => v).length;
  const missing = checks.filter(([, v]) => !v).map(([k]) => k);
  return { pct: Math.round((passed / checks.length) * 100), missing };
}

export async function listEmployees(filters: EmployeeFilters = {}): Promise<ApiResponse<Employee[]>> {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.departmentId) params.set("departmentId", filters.departmentId);
  if (filters.designationId) params.set("designationId", filters.designationId);
  if (filters.types?.length) params.set("types", filters.types.join(","));
  if (filters.statuses?.length) params.set("statuses", filters.statuses.join(","));

  return request<Employee[]>(`/api/employees?${params.toString()}`);
}

export async function getEmployee(id: string): Promise<ApiResponse<Employee>> {
  return request<Employee>(`/api/employees/${id}`);
}

export async function nextEmployeeCode(): Promise<string> {
  // Calculated on backend inside employee creation automatically,
  // return dummy next placeholder code for front UI fields.
  return "AUTO-GEN";
}

export async function createEmployee(
  input: Omit<Employee, "id" | "createdAt" | "updatedAt" | "timeline" | "profileCompleteness" | "documents"> & {
    documents?: EmployeeDocument[];
  },
): Promise<ApiResponse<Employee>> {
  return request<Employee>("/api/employees", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateEmployee(
  id: string,
  patch: Partial<Employee>,
  actor = "HR Admin",
  summary = "Profile updated.",
): Promise<ApiResponse<Employee>> {
  return request<Employee>(`/api/employees/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...patch, actor, summary }),
  });
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
  const empRes = await getEmployee(id);
  if (empRes.error || !empRes.data) return empRes;
  const docs = empRes.data.documents.map((d) => (d.id === docId ? { ...d, ...patch } : d));
  return updateEmployee(id, { documents: docs }, "HR Admin", `Document "${docs.find((d) => d.id === docId)?.label}" updated.`);
}

export async function archiveEmployees(ids: string[]): Promise<ApiResponse<number>> {
  let count = 0;
  for (const id of ids) {
    const res = await request<boolean>(`/api/employees/${id}`, {
      method: "DELETE",
    });
    if (res.data) count++;
  }
  return { data: count, error: null };
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