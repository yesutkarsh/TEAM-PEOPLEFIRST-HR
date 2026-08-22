/** Leave management API client connected to Next.js. */
import type { ApiResponse } from "../types/api";
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
import { request } from "./client";

export const leaveApi = {
  // Leave Types
  async listLeaveTypes(): Promise<ApiResponse<LeaveType[]>> {
    return request<LeaveType[]>("/api/leave/types");
  },
  async upsertLeaveType(input: Omit<LeaveType, "id"> & { id?: string }): Promise<ApiResponse<LeaveType>> {
    return request<LeaveType>("/api/leave/types", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  async deleteLeaveType(id: string): Promise<ApiResponse<true>> {
    return request<true>(`/api/leave/types?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  // Policies
  async listPolicies(): Promise<ApiResponse<LeavePolicy[]>> {
    return request<LeavePolicy[]>("/api/leave/policies");
  },
  async upsertPolicy(input: Omit<LeavePolicy, "id" | "employeeCount" | "allocations"> & { id?: string; allocations: { leaveTypeId: string; daysOverride?: number }[] }): Promise<ApiResponse<LeavePolicy>> {
    return request<LeavePolicy>("/api/leave/policies", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  async deletePolicy(id: string): Promise<ApiResponse<true>> {
    return request<true>(`/api/leave/policies?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  // Balances
  async getBalances(employeeId: string, year?: number): Promise<ApiResponse<LeaveBalance[]>> {
    const y = year || new Date().getFullYear();
    const res = await request<LeaveBalance[]>(`/api/leave/balances?employeeId=${employeeId}&year=${y}`);
    return res;
  },
  async adjustBalance(input: {
    employeeId: string;
    leaveTypeId: string;
    adjustment: number;
    reason: string;
  }): Promise<ApiResponse<true>> {
    return request<true>("/api/leave/balances", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  // Requests
  async listRequests(filters: { employeeId?: string; managerId?: string; statuses?: LeaveRequestStatus[] } = {}): Promise<ApiResponse<LeaveRequest[]>> {
    const params = new URLSearchParams();
    if (filters.employeeId) params.set("employeeId", filters.employeeId);
    if (filters.managerId) params.set("managerId", filters.managerId);
    if (filters.statuses?.length) params.set("statuses", filters.statuses.join(","));

    const res = await request<any[]>(`/api/leave/requests?${params.toString()}`);
    if (res.data) {
      const parsed = res.data.map((r) => ({
        ...r,
        startDate: new Date(r.startDate),
        endDate: new Date(r.endDate),
        appliedAt: new Date(r.appliedAt),
        approvals: r.approvals ? r.approvals.map((a: any) => ({ ...a, actionAt: new Date(a.actionAt) })) : [],
      }));
      return { data: parsed, error: null };
    }
    return { data: null, error: res.error };
  },

  async createRequest(input: {
    employeeId: string;
    leaveTypeId: string;
    startDate: Date;
    endDate: Date;
    isHalfDay: boolean;
    halfDayPeriod?: "first_half" | "second_half";
    workingDays: number;
    reason?: string;
    documentUrl?: string;
    documentName?: string;
  }): Promise<ApiResponse<LeaveRequest>> {
    return request<LeaveRequest>("/api/leave/requests", {
      method: "POST",
      body: JSON.stringify({
        ...input,
        startDate: input.startDate.toISOString(),
        endDate: input.endDate.toISOString(),
      }),
    });
  },

  async cancelRequest(id: string, reason?: string): Promise<ApiResponse<true>> {
    return request<true>("/api/leave/requests", {
      method: "PUT",
      body: JSON.stringify({ id, action: "cancelled", comment: reason }),
    });
  },

  async actOnRequest(
    id: string,
    action: "approved" | "rejected",
    reviewerName: string,
    comment?: string,
  ): Promise<ApiResponse<LeaveRequest>> {
    const res = await request<boolean>("/api/leave/requests", {
      method: "PUT",
      body: JSON.stringify({ id, action, comment }),
    });
    return { data: null, error: res.error };
  },

  async getTeamLeaves(): Promise<ApiResponse<TeamLeaveEntry[]>> {
    const res = await request<any[]>("/api/leave/requests?statuses=approved");
    if (res.data) {
      const formatted = res.data.map((r) => ({
        employeeId: r.employeeId,
        employeeName: r.employeeName,
        leaveType: r.leaveType,
        startDate: new Date(r.startDate),
        endDate: new Date(r.endDate),
        isHalfDay: r.isHalfDay,
      }));
      return { data: formatted, error: null };
    }
    return { data: null, error: res.error };
  },
};
