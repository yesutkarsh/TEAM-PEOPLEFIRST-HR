/** HR dashboard data shapes. */
export interface HRMetrics {
  totalEmployees: number;
  totalEmployeesNote: string;
  onLeaveToday: number;
  onLeaveTodayNote: string;
  openPositions: number;
  openPositionsNote: string;
  pendingApprovals: number;
  pendingApprovalsNote: string;
}

export type ApprovalType = "leave" | "regularisation";

export interface PendingApproval {
  id: string;
  employeeName: string;
  employeeInitials: string;
  type: ApprovalType;
  dateRange: string;
  reason: string;
}

export interface LeaveToday {
  id: string;
  employeeName: string;
  employeeInitials: string;
  leaveType: "Annual" | "Sick" | "Casual";
  returnDate: string;
}

export type UpcomingEventType = "birthday" | "anniversary" | "probation";

export interface UpcomingEvent {
  id: string;
  type: UpcomingEventType;
  employeeName: string;
  description: string;
  date: string;
}

export interface ActivityItem {
  id: string;
  actorName: string;
  actorInitials: string;
  description: string;
  timestamp: string;
}
