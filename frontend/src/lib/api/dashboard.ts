/** HR dashboard mock data. */
import type { ApiResponse } from "../types/api";
import type {
  ActivityItem,
  HRMetrics,
  LeaveToday,
  PendingApproval,
  UpcomingEvent,
} from "../types/dashboard";
import { delay, ok } from "./client";

const APPROVALS_KEY = "hrms.dashboard.approvals";

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function readApprovals(): PendingApproval[] {
  if (typeof window === "undefined") return seededApprovals();
  try {
    const raw = window.localStorage.getItem(APPROVALS_KEY);
    if (raw) return JSON.parse(raw) as PendingApproval[];
    const seed = seededApprovals();
    window.localStorage.setItem(APPROVALS_KEY, JSON.stringify(seed));
    return seed;
  } catch { return seededApprovals(); }
}

function writeApprovals(list: PendingApproval[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(APPROVALS_KEY, JSON.stringify(list));
}

function seededApprovals(): PendingApproval[] {
  return [
    { id: "ap_1", employeeName: "Sarah Carter", employeeInitials: initials("Sarah Carter"), type: "leave", dateRange: "Jul 18 – Jul 22", reason: "Annual leave — family trip" },
    { id: "ap_2", employeeName: "Marcus Khan", employeeInitials: initials("Marcus Khan"), type: "leave", dateRange: "Jul 16", reason: "Sick leave" },
    { id: "ap_3", employeeName: "Priya Sharma", employeeInitials: initials("Priya Sharma"), type: "regularisation", dateRange: "Jul 14", reason: "Missed check-out" },
    { id: "ap_4", employeeName: "Daniel Okafor", employeeInitials: initials("Daniel Okafor"), type: "leave", dateRange: "Jul 21 – Jul 23", reason: "Casual leave" },
  ];
}

export const dashboardApi = {
  async getMetrics(): Promise<ApiResponse<HRMetrics>> {
    const approvals = readApprovals().length;
    return delay(ok({
      totalEmployees: 298,
      totalEmployeesNote: "+2 joined this month",
      onLeaveToday: 14,
      onLeaveTodayNote: "8 approved · 6 pending",
      openPositions: 7,
      openPositionsNote: "3 closing this week",
      pendingApprovals: approvals,
      pendingApprovalsNote: approvals === 0 ? "All clear" : "Needs your action",
    }));
  },

  async listPendingApprovals(): Promise<ApiResponse<PendingApproval[]>> {
    return delay(ok(readApprovals()));
  },

  async resolveApproval(id: string, _decision: "approve" | "decline"): Promise<ApiResponse<true>> {
    writeApprovals(readApprovals().filter((a) => a.id !== id));
    return delay(ok(true as const), 200);
  },

  async listLeaveToday(): Promise<ApiResponse<LeaveToday[]>> {
    return delay(ok([
      { id: "l_1", employeeName: "Ava Mitchell", employeeInitials: initials("Ava Mitchell"), leaveType: "Annual", returnDate: "Jul 16" },
      { id: "l_2", employeeName: "Hiro Tanaka", employeeInitials: initials("Hiro Tanaka"), leaveType: "Sick", returnDate: "Jul 15" },
      { id: "l_3", employeeName: "Lena Müller", employeeInitials: initials("Lena Müller"), leaveType: "Annual", returnDate: "Jul 20" },
      { id: "l_4", employeeName: "Omar Haddad", employeeInitials: initials("Omar Haddad"), leaveType: "Casual", returnDate: "Jul 15" },
    ]));
  },

  async listUpcomingEvents(): Promise<ApiResponse<UpcomingEvent[]>> {
    return delay(ok([
      { id: "e_1", type: "birthday", employeeName: "Sarah Carter", description: "turns 32", date: "Jul 16" },
      { id: "e_2", type: "anniversary", employeeName: "Marcus Khan", description: "3 years at Acme", date: "Jul 17" },
      { id: "e_3", type: "probation", employeeName: "Yuki Sato", description: "probation ends in 3 days", date: "Jul 18" },
      { id: "e_4", type: "birthday", employeeName: "Daniel Okafor", description: "turns 28", date: "Jul 19" },
    ]));
  },

  async listRecentActivity(): Promise<ApiResponse<ActivityItem[]>> {
    return delay(ok([
      { id: "ac_1", actorName: "Jordan Reyes", actorInitials: initials("Jordan Reyes"), description: "Approved Sarah Carter's leave request", timestamp: "2 hours ago" },
      { id: "ac_2", actorName: "Theo Park", actorInitials: initials("Theo Park"), description: "Added Yuki Sato as a new employee", timestamp: "5 hours ago" },
      { id: "ac_3", actorName: "Maya Singh", actorInitials: initials("Maya Singh"), description: "Updated Engineering department head", timestamp: "Yesterday at 4:12 PM" },
      { id: "ac_4", actorName: "Jordan Reyes", actorInitials: initials("Jordan Reyes"), description: "Changed company theme accent color", timestamp: "Yesterday at 11:48 AM" },
      { id: "ac_5", actorName: "Riley Chen", actorInitials: initials("Riley Chen"), description: "Closed open requisition · Account Executive", timestamp: "2 days ago" },
    ]));
  },
};
