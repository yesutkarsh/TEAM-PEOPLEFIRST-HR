/**
 * Employee Self-Service mock API. Browser-storage backed, no backend.
 * Seeds realistic demo data on first read so every ESS screen has content.
 */
import type { ApiResponse } from "../types/api";
import type {
  Announcement,
  AppNotification,
  ExpenseClaim,
  HelpdeskTicket,
  ProfileChangeRequest,
  TicketComment,
} from "../types/ess";
import { delay, fail, ok, uid } from "./client";

const NOTIF_KEY = "hrms.ess.notifications";
const ANN_KEY = "hrms.ess.announcements";
const TICKET_KEY = "hrms.ess.tickets";
const EXPENSE_KEY = "hrms.ess.expenses";
const PCR_KEY = "hrms.ess.profileChangeRequests";

function read<T>(key: string, seed: T): T {
  if (typeof window === "undefined") return seed;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as T;
  } catch {
    return seed;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3600_000).toISOString();
}
function daysAgo(d: number) {
  return new Date(Date.now() - d * 86_400_000).toISOString();
}
function dateKey(d: number) {
  return new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);
}

// ───────────────────────── seeds ─────────────────────────

const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: "ntf_1", category: "leave", title: "Leave request approved",
    body: "Your annual leave for 3 days has been approved by Priya Nair.",
    createdAt: hoursAgo(2), read: false, actionTo: "/leave/requests", actionLabel: "View request",
  },
  {
    id: "ntf_2", category: "payroll", title: "Payslip available",
    body: "Your pay slip for last month is ready to download.",
    createdAt: hoursAgo(20), read: false, actionTo: "/payroll/payslips", actionLabel: "Open payslips",
  },
  {
    id: "ntf_3", category: "attendance", title: "Missing punch detected",
    body: "No clock-out recorded on your last working day. Raise a regularisation.",
    createdAt: daysAgo(1), read: false, actionTo: "/attendance/regularization", actionLabel: "Regularise",
  },
  {
    id: "ntf_4", category: "performance", title: "Self-assessment due",
    body: "Your review self-assessment closes in 5 days.",
    createdAt: daysAgo(2), read: true, actionTo: "/performance/reviews", actionLabel: "Start review",
  },
  {
    id: "ntf_5", category: "announcement", title: "New leave policy published",
    body: "Carry-forward limits have changed from this financial year.",
    createdAt: daysAgo(3), read: true, actionTo: "/announcements", actionLabel: "Read",
  },
  {
    id: "ntf_6", category: "helpdesk", title: "Ticket HD-1042 updated",
    body: "IT support replied to your laptop replacement request.",
    createdAt: daysAgo(4), read: true, actionTo: "/helpdesk", actionLabel: "View ticket",
  },
];

const SEED_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann_1", title: "Revised leave policy effective this quarter",
    body: "Carry-forward is now capped at 10 days and lapses on 31 March. Encashment requests open in the last week of the financial year. Please review your balances and plan pending leave accordingly.",
    category: "policy", pinned: true, author: "People Operations", publishedAt: daysAgo(3),
    audience: "All employees", requiresAck: true, acknowledged: false,
  },
  {
    id: "ann_2", title: "Quarterly town hall — Friday 4:00 PM",
    body: "Join the leadership team for the quarterly business update, followed by an open Q&A. Calendar invites have been sent to all employees.",
    category: "event", pinned: true, author: "Internal Comms", publishedAt: daysAgo(1), audience: "All employees",
  },
  {
    id: "ann_3", title: "Office closed on account of local holiday",
    body: "The office will remain closed next Monday. Attendance will be auto-marked as holiday for all locations in Bengaluru.",
    category: "general", pinned: false, author: "Admin", publishedAt: daysAgo(5), audience: "Bengaluru",
  },
  {
    id: "ann_4", title: "Welcome to our newest joiners",
    body: "Please join us in welcoming six new colleagues across Engineering, Design and Sales who joined this month.",
    category: "celebration", pinned: false, author: "People Operations", publishedAt: daysAgo(8), audience: "All employees",
  },
  {
    id: "ann_5", title: "Action needed: update your emergency contact",
    body: "Records show several profiles without an emergency contact. Please update yours from My profile before the end of the month.",
    category: "urgent", pinned: false, author: "HR Compliance", publishedAt: daysAgo(11), audience: "All employees",
  },
];

const SEED_TICKETS: HelpdeskTicket[] = [
  {
    id: "tkt_1", code: "HD-1042", subject: "Laptop replacement request",
    description: "My laptop battery drains within an hour and the fan is noisy. Requesting a replacement or repair.",
    category: "it", priority: "high", status: "in_progress",
    raisedByEmployeeId: "", raisedByName: "You", assignedTo: "IT Support",
    createdAt: daysAgo(4), updatedAt: daysAgo(1),
    comments: [
      { id: "c1", author: "IT Support", message: "We have raised a hardware ticket with the vendor. Expect a loaner device tomorrow.", at: daysAgo(1) },
    ],
  },
  {
    id: "tkt_2", code: "HD-1039", subject: "Payslip shows incorrect HRA",
    description: "The HRA component in last month's payslip looks lower than my salary structure.",
    category: "payroll", priority: "medium", status: "resolved",
    raisedByEmployeeId: "", raisedByName: "You", assignedTo: "Payroll Team",
    createdAt: daysAgo(12), updatedAt: daysAgo(9),
    comments: [
      { id: "c2", author: "Payroll Team", message: "This was a proration for mid-month structure revision. Corrected arrears will reflect next cycle.", at: daysAgo(9) },
    ],
  },
  {
    id: "tkt_3", code: "HD-1031", subject: "Access card not working at Gate 2",
    description: "Card is rejected at the Gate 2 reader since Monday.",
    category: "facilities", priority: "low", status: "closed",
    raisedByEmployeeId: "", raisedByName: "You", assignedTo: "Facilities",
    createdAt: daysAgo(21), updatedAt: daysAgo(18), comments: [],
  },
];

const SEED_EXPENSES: ExpenseClaim[] = [
  {
    id: "exp_1", code: "EXP-2041", employeeId: "", employeeName: "You", category: "travel",
    title: "Client visit — cab fare", amount: 2450, spentOn: dateKey(6), status: "submitted",
    receiptName: "cab-receipt.pdf", submittedAt: daysAgo(5),
    description: "Round trip to client office for the quarterly review.",
  },
  {
    id: "exp_2", code: "EXP-2033", employeeId: "", employeeName: "You", category: "meals",
    title: "Team lunch", amount: 5200, spentOn: dateKey(20), status: "reimbursed",
    receiptName: "lunch-bill.jpg", submittedAt: daysAgo(19), decidedAt: daysAgo(15),
  },
  {
    id: "exp_3", code: "EXP-2027", employeeId: "", employeeName: "You", category: "equipment",
    title: "Mechanical keyboard", amount: 7800, spentOn: dateKey(34), status: "rejected",
    submittedAt: daysAgo(33), decidedAt: daysAgo(30),
    decisionNote: "Peripherals must be requested through the IT asset process.",
  },
];

// ───────────────────────── notifications ─────────────────────────

function loadNotifications(): AppNotification[] {
  return read(NOTIF_KEY, SEED_NOTIFICATIONS).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const essApi = {
  async listNotifications(): Promise<ApiResponse<AppNotification[]>> {
    return delay(ok(loadNotifications()));
  },

  async unreadCount(): Promise<ApiResponse<number>> {
    return delay(ok(loadNotifications().filter((n) => !n.read).length), 80);
  },

  async markRead(id: string): Promise<ApiResponse<AppNotification[]>> {
    const next = loadNotifications().map((n) => (n.id === id ? { ...n, read: true } : n));
    write(NOTIF_KEY, next);
    return delay(ok(next), 80);
  },

  async markAllRead(): Promise<ApiResponse<AppNotification[]>> {
    const next = loadNotifications().map((n) => ({ ...n, read: true }));
    write(NOTIF_KEY, next);
    return delay(ok(next), 80);
  },

  async clearNotification(id: string): Promise<ApiResponse<AppNotification[]>> {
    const next = loadNotifications().filter((n) => n.id !== id);
    write(NOTIF_KEY, next);
    return delay(ok(next), 80);
  },

  // ───────────────────────── announcements ─────────────────────────

  async listAnnouncements(): Promise<ApiResponse<Announcement[]>> {
    const list = read(ANN_KEY, SEED_ANNOUNCEMENTS)
      .slice()
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.publishedAt.localeCompare(a.publishedAt));
    return delay(ok(list));
  },

  async acknowledgeAnnouncement(id: string): Promise<ApiResponse<Announcement[]>> {
    const next = read(ANN_KEY, SEED_ANNOUNCEMENTS).map((a) => (a.id === id ? { ...a, acknowledged: true } : a));
    write(ANN_KEY, next);
    return delay(ok(next), 120);
  },

  // ───────────────────────── helpdesk ─────────────────────────

  async listTickets(): Promise<ApiResponse<HelpdeskTicket[]>> {
    const list = read(TICKET_KEY, SEED_TICKETS).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return delay(ok(list));
  },

  async createTicket(input: {
    subject: string;
    description: string;
    category: HelpdeskTicket["category"];
    priority: HelpdeskTicket["priority"];
    raisedByEmployeeId: string;
    raisedByName: string;
    attachmentName?: string;
  }): Promise<ApiResponse<HelpdeskTicket>> {
    if (!input.subject.trim()) return delay(fail<HelpdeskTicket>("Subject is required."));
    if (input.description.trim().length < 10) {
      return delay(fail<HelpdeskTicket>("Please describe the issue in at least 10 characters."));
    }
    const list = read(TICKET_KEY, SEED_TICKETS);
    const now = new Date().toISOString();
    const ticket: HelpdeskTicket = {
      id: uid("tkt_"),
      code: `HD-${1100 + list.length}`,
      subject: input.subject.trim(),
      description: input.description.trim(),
      category: input.category,
      priority: input.priority,
      status: "open",
      raisedByEmployeeId: input.raisedByEmployeeId,
      raisedByName: input.raisedByName,
      createdAt: now,
      updatedAt: now,
      attachmentName: input.attachmentName,
      comments: [],
    };
    write(TICKET_KEY, [ticket, ...list]);
    return delay(ok(ticket));
  },

  async addTicketComment(ticketId: string, comment: Omit<TicketComment, "id" | "at">): Promise<ApiResponse<HelpdeskTicket>> {
    const list = read(TICKET_KEY, SEED_TICKETS);
    const idx = list.findIndex((t) => t.id === ticketId);
    if (idx === -1) return delay(fail<HelpdeskTicket>("Ticket not found."));
    const updated: HelpdeskTicket = {
      ...list[idx],
      updatedAt: new Date().toISOString(),
      comments: [...list[idx].comments, { ...comment, id: uid("c_"), at: new Date().toISOString() }],
    };
    const next = list.slice();
    next[idx] = updated;
    write(TICKET_KEY, next);
    return delay(ok(updated), 120);
  },

  async closeTicket(ticketId: string): Promise<ApiResponse<HelpdeskTicket>> {
    const list = read(TICKET_KEY, SEED_TICKETS);
    const idx = list.findIndex((t) => t.id === ticketId);
    if (idx === -1) return delay(fail<HelpdeskTicket>("Ticket not found."));
    const updated: HelpdeskTicket = { ...list[idx], status: "closed", updatedAt: new Date().toISOString() };
    const next = list.slice();
    next[idx] = updated;
    write(TICKET_KEY, next);
    return delay(ok(updated), 120);
  },

  // ───────────────────────── expenses ─────────────────────────

  async listExpenses(): Promise<ApiResponse<ExpenseClaim[]>> {
    const list = read(EXPENSE_KEY, SEED_EXPENSES).slice().sort((a, b) => b.spentOn.localeCompare(a.spentOn));
    return delay(ok(list));
  },

  async createExpense(input: {
    title: string;
    category: ExpenseClaim["category"];
    amount: number | null;
    spentOn: string;
    description?: string;
    receiptName?: string;
    employeeId: string;
    employeeName: string;
    submit: boolean;
  }): Promise<ApiResponse<ExpenseClaim>> {
    if (!input.title.trim()) return delay(fail<ExpenseClaim>("Give the claim a short title."));
    if (!input.amount || input.amount <= 0) return delay(fail<ExpenseClaim>("Enter an amount greater than zero."));
    if (!input.spentOn) return delay(fail<ExpenseClaim>("Select the date the expense was incurred."));
    if (input.spentOn > new Date().toISOString().slice(0, 10)) {
      return delay(fail<ExpenseClaim>("Expense date cannot be in the future."));
    }
    const list = read(EXPENSE_KEY, SEED_EXPENSES);
    const claim: ExpenseClaim = {
      id: uid("exp_"),
      code: `EXP-${2100 + list.length}`,
      employeeId: input.employeeId,
      employeeName: input.employeeName,
      category: input.category,
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      amount: input.amount,
      spentOn: input.spentOn,
      status: input.submit ? "submitted" : "draft",
      receiptName: input.receiptName,
      submittedAt: input.submit ? new Date().toISOString() : undefined,
    };
    write(EXPENSE_KEY, [claim, ...list]);
    return delay(ok(claim));
  },

  async submitExpense(id: string): Promise<ApiResponse<ExpenseClaim[]>> {
    const next = read(EXPENSE_KEY, SEED_EXPENSES).map((e) =>
      e.id === id && e.status === "draft"
        ? { ...e, status: "submitted" as const, submittedAt: new Date().toISOString() }
        : e,
    );
    write(EXPENSE_KEY, next);
    return delay(ok(next), 120);
  },

  async deleteExpense(id: string): Promise<ApiResponse<ExpenseClaim[]>> {
    const next = read(EXPENSE_KEY, SEED_EXPENSES).filter((e) => e.id !== id);
    write(EXPENSE_KEY, next);
    return delay(ok(next), 120);
  },

  // ───────────────────── profile change requests ─────────────────────

  async listChangeRequests(employeeId: string): Promise<ApiResponse<ProfileChangeRequest[]>> {
    const list = read<ProfileChangeRequest[]>(PCR_KEY, []).filter((r) => r.employeeId === employeeId);
    return delay(ok(list.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))), 120);
  },

  async requestProfileChange(input: {
    employeeId: string;
    field: string;
    label: string;
    currentValue: string;
    requestedValue: string;
  }): Promise<ApiResponse<ProfileChangeRequest>> {
    if (!input.requestedValue.trim()) return delay(fail<ProfileChangeRequest>("Enter the new value."));
    if (input.requestedValue.trim() === input.currentValue) {
      return delay(fail<ProfileChangeRequest>("The new value is the same as the current one."));
    }
    const list = read<ProfileChangeRequest[]>(PCR_KEY, []);
    if (list.some((r) => r.employeeId === input.employeeId && r.field === input.field && r.status === "pending")) {
      return delay(fail<ProfileChangeRequest>("A change request for this field is already awaiting approval."));
    }
    const req: ProfileChangeRequest = {
      id: uid("pcr_"),
      employeeId: input.employeeId,
      field: input.field,
      label: input.label,
      currentValue: input.currentValue,
      requestedValue: input.requestedValue.trim(),
      status: "pending",
      requestedAt: new Date().toISOString(),
    };
    write(PCR_KEY, [req, ...list]);
    return delay(ok(req));
  },

  async cancelChangeRequest(id: string): Promise<ApiResponse<true>> {
    write(PCR_KEY, read<ProfileChangeRequest[]>(PCR_KEY, []).filter((r) => r.id !== id));
    return delay(ok(true as const), 100);
  },
};