/** Employee Self-Service (ESS) domain types — notifications, announcements, helpdesk, expenses, profile change requests. */

export type NotificationCategory =
  | "leave"
  | "attendance"
  | "payroll"
  | "performance"
  | "announcement"
  | "helpdesk"
  | "expense"
  | "system";

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  createdAt: string; // ISO
  read: boolean;
  actionTo?: string;
  actionLabel?: string;
}

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  leave: "Leave",
  attendance: "Attendance",
  payroll: "Payroll",
  performance: "Performance",
  announcement: "Announcement",
  helpdesk: "Helpdesk",
  expense: "Expenses",
  system: "System",
};

export type AnnouncementCategory = "general" | "policy" | "event" | "celebration" | "urgent";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  pinned: boolean;
  author: string;
  publishedAt: string; // ISO
  audience: string;
  acknowledged?: boolean;
  requiresAck?: boolean;
}

export const ANNOUNCEMENT_CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  general: "General",
  policy: "Policy",
  event: "Event",
  celebration: "Celebration",
  urgent: "Urgent",
};

export type TicketCategory = "it" | "hr" | "payroll" | "facilities" | "other";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export interface TicketComment {
  id: string;
  author: string;
  message: string;
  at: string; // ISO
  internal?: boolean;
}

export interface HelpdeskTicket {
  id: string;
  code: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  raisedByEmployeeId: string;
  raisedByName: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  attachmentName?: string;
  comments: TicketComment[];
}

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  it: "IT support",
  hr: "HR query",
  payroll: "Payroll",
  facilities: "Facilities",
  other: "Other",
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export type ExpenseCategory = "travel" | "meals" | "accommodation" | "equipment" | "training" | "other";
export type ExpenseStatus = "draft" | "submitted" | "approved" | "rejected" | "reimbursed";

export interface ExpenseClaim {
  id: string;
  code: string;
  employeeId: string;
  employeeName: string;
  category: ExpenseCategory;
  title: string;
  description?: string;
  amount: number;
  spentOn: string; // yyyy-mm-dd
  status: ExpenseStatus;
  receiptName?: string;
  submittedAt?: string;
  decidedAt?: string;
  decisionNote?: string;
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  travel: "Travel",
  meals: "Meals",
  accommodation: "Accommodation",
  equipment: "Equipment",
  training: "Training",
  other: "Other",
};

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  reimbursed: "Reimbursed",
};

export type ChangeRequestStatus = "pending" | "approved" | "rejected";

/** Sensitive profile fields cannot be edited directly — they raise an approval request. */
export interface ProfileChangeRequest {
  id: string;
  employeeId: string;
  field: string;
  label: string;
  currentValue: string;
  requestedValue: string;
  status: ChangeRequestStatus;
  requestedAt: string;
  decidedAt?: string;
  note?: string;
}

export const SENSITIVE_PROFILE_FIELDS = [
  "bankAccountNumber",
  "bankIfsc",
  "panNumber",
  "aadhaarNumber",
] as const;