/** Leave management domain types (Phase 5). */
import type { Employee, EmploymentType } from "./employee";

export type LeaveCategory = "earned" | "statutory" | "special" | "compensatory" | "loss_of_pay";
export type AccrualType = "upfront" | "monthly" | "quarterly" | "on_service_completion";
export type DocumentRequirement = "never" | "always" | "after_n_days";
export type ApplicableGender = "all" | "male" | "female";

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  description?: string;
  category: LeaveCategory;
  isPaid: boolean;
  applicableGender: ApplicableGender;
  allowHalfDay: boolean;
  documentRequired: DocumentRequirement;
  documentAfterDays?: number;
  minDaysPerRequest: number;
  maxDaysPerRequest?: number;
  accrualType: AccrualType;
  annualAllocation: number;
  carryForwardMax?: number;
  carryForwardLapseDate?: string; // MM-DD
  encashmentAllowed: boolean;
  encashmentMaxDays?: number;
  color: string;
  isActive: boolean;
}

export interface LeavePolicyAllocation {
  leaveTypeId: string;
  leaveType: LeaveType;
  daysOverride?: number;
}

export interface LeavePolicyEligibility {
  employmentTypes?: EmploymentType[];
  grades?: string[];
  departmentIds?: string[];
}

export interface LeavePolicy {
  id: string;
  name: string;
  description?: string;
  allocations: LeavePolicyAllocation[];
  eligibility: LeavePolicyEligibility;
  isDefault: boolean;
  employeeCount: number;
}

export interface LeaveBalance {
  employeeId: string;
  leaveTypeId: string;
  leaveType: LeaveType;
  year: number;
  allocated: number;
  accrued: number;
  used: number;
  pending: number;
  carried: number;
  available: number;
  encashed: number;
}

export type HalfDayPeriod = "first_half" | "second_half";

export type LeaveRequestStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "auto_approved";

export type ApprovalLevel = "manager" | "hr_admin";

export interface LeaveApproval {
  id: string;
  requestId: string;
  level: ApprovalLevel;
  approverId: string;
  approver: Employee | null;
  approverName: string;
  action: "approved" | "rejected";
  comment?: string;
  actionAt: Date;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee: Employee | null;
  employeeName: string;
  departmentId?: string;
  leaveTypeId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  isHalfDay: boolean;
  halfDayPeriod?: HalfDayPeriod;
  workingDays: number;
  reason?: string;
  documentUrl?: string;
  documentName?: string;
  status: LeaveRequestStatus;
  appliedAt: Date;
  approvals: LeaveApproval[];
  cancelledAt?: Date;
  cancelReason?: string;
  twoLevel: boolean;
}

export interface LeaveAdjustment {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  adjustment: number;
  reason: string;
  adjustedBy: string;
  adjustedAt: Date;
}

export interface TeamLeaveEntry {
  employeeId: string;
  employeeName: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  isHalfDay: boolean;
}

export const LEAVE_CATEGORY_LABELS: Record<LeaveCategory, string> = {
  earned: "Earned",
  statutory: "Statutory",
  special: "Special",
  compensatory: "Compensatory",
  loss_of_pay: "Loss of Pay",
};

export const ACCRUAL_LABELS: Record<AccrualType, string> = {
  upfront: "Upfront",
  monthly: "Monthly",
  quarterly: "Quarterly",
  on_service_completion: "On service completion",
};

export const LEAVE_STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  auto_approved: "Auto approved",
};
