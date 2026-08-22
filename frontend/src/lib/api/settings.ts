/** Company settings: departments, designations, work calendar, holidays. */
import type { ApiResponse } from "../types/api";
import { delay, fail, ok, uid } from "./client";

const DEPT_KEY = "hrms.settings.departments";
const DESIG_KEY = "hrms.settings.designations";
const CAL_KEY = "hrms.settings.workCalendar";
const SHIFT_KEY = "hrms.settings.shifts";
const HOL_KEY = "hrms.settings.holidays";
const NAT_HOL_KEY = "hrms.settings.nationalHolidaysToggled";

export interface Department {
  id: string;
  name: string;
  parentId: string | null;
  description?: string;
  employeeCount: number;
  headName?: string;
}

export interface Designation {
  id: string;
  name: string;
  grade: string;
  departmentIds: string[];
  description?: string;
  employeeCount: number;
}

export interface WorkCalendar {
  workingDays: number[]; // 0=Sun, 1=Mon, ... 6=Sat
}

export interface Shift {
  id: string;
  name: string;
  startTime: string; // HH:mm
  endTime: string;
  breakMinutes: number;
  days: number[];
  graceMinutes: number;
}

export interface CompanyHoliday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  type: "full" | "half";
  description?: string;
}

export interface NationalHoliday {
  id: string;
  name: string;
  date: string;
  observed: boolean;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

const DEFAULT_CAL: WorkCalendar = { workingDays: [1, 2, 3, 4, 5] };

const DEFAULT_DEPTS: Department[] = [
  { id: "d_eng", name: "Engineering", parentId: null, employeeCount: 84, headName: "Maya Singh" },
  { id: "d_des", name: "Design", parentId: null, employeeCount: 18, headName: "Theo Park" },
  { id: "d_ppl", name: "People Operations", parentId: null, employeeCount: 9, headName: "Jordan Reyes" },
  { id: "d_sal", name: "Sales", parentId: null, employeeCount: 62, headName: "Riley Chen" },
];

const DEFAULT_DESIG: Designation[] = [
  { id: "g_sse", name: "Senior Software Engineer", grade: "L4", departmentIds: ["d_eng"], employeeCount: 28 },
  { id: "g_se", name: "Software Engineer", grade: "L3", departmentIds: ["d_eng"], employeeCount: 36 },
  { id: "g_pd", name: "Product Designer", grade: "L3", departmentIds: ["d_des"], employeeCount: 12 },
  { id: "g_ae", name: "Account Executive", grade: "Band 2", departmentIds: ["d_sal"], employeeCount: 22 },
];

const NATIONAL_HOLIDAYS_BY_COUNTRY: Record<string, Array<{ name: string; date: string }>> = {
  "United States": [
    { name: "New Year's Day", date: "2026-01-01" },
    { name: "Martin Luther King Jr. Day", date: "2026-01-19" },
    { name: "Memorial Day", date: "2026-05-25" },
    { name: "Independence Day", date: "2026-07-04" },
    { name: "Labor Day", date: "2026-09-07" },
    { name: "Thanksgiving", date: "2026-11-26" },
    { name: "Christmas Day", date: "2026-12-25" },
  ],
  "United Kingdom": [
    { name: "New Year's Day", date: "2026-01-01" },
    { name: "Good Friday", date: "2026-04-03" },
    { name: "Easter Monday", date: "2026-04-06" },
    { name: "Early May Bank Holiday", date: "2026-05-04" },
    { name: "Christmas Day", date: "2026-12-25" },
    { name: "Boxing Day", date: "2026-12-26" },
  ],
  "India": [
    { name: "Republic Day", date: "2026-01-26" },
    { name: "Holi", date: "2026-03-04" },
    { name: "Independence Day", date: "2026-08-15" },
    { name: "Gandhi Jayanti", date: "2026-10-02" },
    { name: "Diwali", date: "2026-11-08" },
  ],
};

export const settingsApi = {
  // Departments
  async listDepartments(): Promise<ApiResponse<Department[]>> {
    const list = read<Department[]>(DEPT_KEY, DEFAULT_DEPTS);
    if (read<Department[] | null>(DEPT_KEY, null) === null) write(DEPT_KEY, list);
    return delay(ok(list));
  },
  async upsertDepartment(input: Omit<Department, "id" | "employeeCount"> & { id?: string }): Promise<ApiResponse<Department>> {
    const list = read<Department[]>(DEPT_KEY, []);
    if (input.id) {
      const idx = list.findIndex((d) => d.id === input.id);
      if (idx === -1) return delay(fail("Department not found."));
      list[idx] = { ...list[idx], ...input } as Department;
      write(DEPT_KEY, list);
      return delay(ok(list[idx]));
    }
    const created: Department = { ...input, id: uid("d_"), employeeCount: 0 };
    write(DEPT_KEY, [created, ...list]);
    return delay(ok(created));
  },
  async deleteDepartment(id: string): Promise<ApiResponse<true>> {
    const list = read<Department[]>(DEPT_KEY, []);
    write(DEPT_KEY, list.filter((d) => d.id !== id));
    return delay(ok(true as const));
  },

  // Designations
  async listDesignations(): Promise<ApiResponse<Designation[]>> {
    const list = read<Designation[]>(DESIG_KEY, DEFAULT_DESIG);
    if (read<Designation[] | null>(DESIG_KEY, null) === null) write(DESIG_KEY, list);
    return delay(ok(list));
  },
  async upsertDesignation(input: Omit<Designation, "id" | "employeeCount"> & { id?: string }): Promise<ApiResponse<Designation>> {
    const list = read<Designation[]>(DESIG_KEY, []);
    if (input.id) {
      const idx = list.findIndex((d) => d.id === input.id);
      if (idx === -1) return delay(fail("Designation not found."));
      list[idx] = { ...list[idx], ...input } as Designation;
      write(DESIG_KEY, list);
      return delay(ok(list[idx]));
    }
    const created: Designation = { ...input, id: uid("g_"), employeeCount: 0 };
    write(DESIG_KEY, [created, ...list]);
    return delay(ok(created));
  },
  async deleteDesignation(id: string): Promise<ApiResponse<true>> {
    const list = read<Designation[]>(DESIG_KEY, []);
    write(DESIG_KEY, list.filter((d) => d.id !== id));
    return delay(ok(true as const));
  },

  // Work Calendar
  async getWorkCalendar(): Promise<ApiResponse<WorkCalendar>> {
    return delay(ok(read<WorkCalendar>(CAL_KEY, DEFAULT_CAL)));
  },
  async saveWorkCalendar(cal: WorkCalendar): Promise<ApiResponse<WorkCalendar>> {
    write(CAL_KEY, cal);
    return delay(ok(cal));
  },

  // Shifts
  async listShifts(): Promise<ApiResponse<Shift[]>> {
    return delay(ok(read<Shift[]>(SHIFT_KEY, [
      { id: "sh_gen", name: "General Shift", startTime: "09:30", endTime: "18:30", breakMinutes: 60, days: [1,2,3,4,5], graceMinutes: 15 },
    ])));
  },
  async upsertShift(input: Omit<Shift, "id"> & { id?: string }): Promise<ApiResponse<Shift>> {
    const list = read<Shift[]>(SHIFT_KEY, []);
    if (input.id) {
      const idx = list.findIndex((s) => s.id === input.id);
      if (idx === -1) return delay(fail("Shift not found."));
      list[idx] = { ...input, id: input.id } as Shift;
      write(SHIFT_KEY, list);
      return delay(ok(list[idx]));
    }
    const created: Shift = { ...input, id: uid("sh_") };
    write(SHIFT_KEY, [created, ...list]);
    return delay(ok(created));
  },
  async deleteShift(id: string): Promise<ApiResponse<true>> {
    write(SHIFT_KEY, read<Shift[]>(SHIFT_KEY, []).filter((s) => s.id !== id));
    return delay(ok(true as const));
  },

  // Holidays
  async getNationalHolidays(country: string): Promise<ApiResponse<NationalHoliday[]>> {
    const base = NATIONAL_HOLIDAYS_BY_COUNTRY[country] ?? NATIONAL_HOLIDAYS_BY_COUNTRY["United States"];
    const toggles = read<Record<string, boolean>>(NAT_HOL_KEY, {});
    return delay(ok(base.map((h) => ({
      id: `nh_${h.date}`,
      name: h.name,
      date: h.date,
      observed: toggles[`nh_${h.date}`] ?? true,
    }))));
  },
  async toggleNationalHoliday(id: string, observed: boolean): Promise<ApiResponse<true>> {
    const toggles = read<Record<string, boolean>>(NAT_HOL_KEY, {});
    toggles[id] = observed;
    write(NAT_HOL_KEY, toggles);
    return delay(ok(true as const));
  },
  async listCompanyHolidays(): Promise<ApiResponse<CompanyHoliday[]>> {
    return delay(ok(read<CompanyHoliday[]>(HOL_KEY, [])));
  },
  async upsertCompanyHoliday(input: Omit<CompanyHoliday, "id"> & { id?: string }): Promise<ApiResponse<CompanyHoliday>> {
    const list = read<CompanyHoliday[]>(HOL_KEY, []);
    if (input.id) {
      const idx = list.findIndex((h) => h.id === input.id);
      if (idx === -1) return delay(fail("Holiday not found."));
      list[idx] = { ...input, id: input.id } as CompanyHoliday;
      write(HOL_KEY, list);
      return delay(ok(list[idx]));
    }
    const created: CompanyHoliday = { ...input, id: uid("ch_") };
    write(HOL_KEY, [created, ...list]);
    return delay(ok(created));
  },
  async deleteCompanyHoliday(id: string): Promise<ApiResponse<true>> {
    write(HOL_KEY, read<CompanyHoliday[]>(HOL_KEY, []).filter((h) => h.id !== id));
    return delay(ok(true as const));
  },
};
