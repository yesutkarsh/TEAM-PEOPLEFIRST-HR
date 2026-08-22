/** Company settings API client connected to Next.js. */
import type { ApiResponse } from "../types/api";
import { request } from "./client";

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

export const settingsApi = {
  // Departments
  async listDepartments(): Promise<ApiResponse<Department[]>> {
    return request<Department[]>("/api/settings/departments");
  },
  async upsertDepartment(input: Omit<Department, "id" | "employeeCount"> & { id?: string }): Promise<ApiResponse<Department>> {
    return request<Department>("/api/settings/departments", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  async deleteDepartment(id: string): Promise<ApiResponse<true>> {
    return request<true>(`/api/settings/departments?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  // Designations
  async listDesignations(): Promise<ApiResponse<Designation[]>> {
    return request<Designation[]>("/api/settings/designations");
  },
  async upsertDesignation(input: Omit<Designation, "id" | "employeeCount"> & { id?: string }): Promise<ApiResponse<Designation>> {
    return request<Designation>("/api/settings/designations", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  async deleteDesignation(id: string): Promise<ApiResponse<true>> {
    return request<true>(`/api/settings/designations?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  // Work Calendar
  async getWorkCalendar(): Promise<ApiResponse<WorkCalendar>> {
    return request<WorkCalendar>("/api/settings/work-calendar");
  },
  async saveWorkCalendar(cal: WorkCalendar): Promise<ApiResponse<WorkCalendar>> {
    return request<WorkCalendar>("/api/settings/work-calendar", {
      method: "POST",
      body: JSON.stringify(cal),
    });
  },

  // Shifts
  async listShifts(): Promise<ApiResponse<Shift[]>> {
    return request<Shift[]>("/api/settings/shifts");
  },
  async upsertShift(input: Omit<Shift, "id"> & { id?: string }): Promise<ApiResponse<Shift>> {
    return request<Shift>("/api/settings/shifts", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  async deleteShift(id: string): Promise<ApiResponse<true>> {
    return request<true>(`/api/settings/shifts?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  // Holidays
  async getNationalHolidays(country: string): Promise<ApiResponse<NationalHoliday[]>> {
    return request<NationalHoliday[]>(`/api/settings/holidays?type=national&country=${encodeURIComponent(country)}`);
  },
  async toggleNationalHoliday(id: string, observed: boolean): Promise<ApiResponse<true>> {
    return request<true>("/api/settings/holidays", {
      method: "PUT",
      body: JSON.stringify({ id, observed }),
    });
  },
  async listCompanyHolidays(): Promise<ApiResponse<CompanyHoliday[]>> {
    return request<CompanyHoliday[]>("/api/settings/holidays?type=company");
  },
  async upsertCompanyHoliday(input: Omit<CompanyHoliday, "id"> & { id?: string }): Promise<ApiResponse<CompanyHoliday>> {
    return request<CompanyHoliday>("/api/settings/holidays", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  async deleteCompanyHoliday(id: string): Promise<ApiResponse<true>> {
    return request<true>(`/api/settings/holidays?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};
