/**
 * Phase 10 — AI mock service. Browser-storage backed, no backend.
 * Canned-but-useful responses keyed off keywords, plus mocked anomaly/risk/OCR/draft data.
 */
import type { ApiResponse } from "../types/api";
import type {
  AiChatMessage,
  AiChatSession,
  AiFeedbackValue,
  AiSource,
  AttendanceRiskFlag,
  AttendanceRiskType,
  DraftDocument,
  DraftDocumentType,
  OcrExtractionResult,
  PayrollAnomaly,
} from "../types/ai";
import type { DocumentType, Employee } from "../types/employee";
import { delay, fail, ok, uid } from "./client";
import { listEmployees } from "./employees";

const SESSIONS_KEY = "hrms.ai.sessions";
const ANOMALIES_KEY = "hrms.ai.anomalies";
const RISK_FLAGS_KEY = "hrms.ai.riskFlags";
const DRAFTS_KEY = "hrms.ai.drafts";

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

function daysAgo(d: number) {
  return new Date(Date.now() - d * 86_400_000).toISOString();
}
function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

// ───────────────────────── rate limiting & rare failure ─────────────────────────

const lastSendAt = new Map<string, number>();
let callCounter = 0;

function shouldSimulateFailure(): boolean {
  callCounter += 1;
  return callCounter % 12 === 0;
}

// ───────────────────────── chat sessions ─────────────────────────

function loadSessions(): AiChatSession[] {
  return read<AiChatSession[]>(SESSIONS_KEY, []);
}
function saveSessions(list: AiChatSession[]) {
  write(SESSIONS_KEY, list);
}

function newSession(employeeId: string): AiChatSession {
  return {
    id: uid("aisess_"),
    employeeId,
    title: "New conversation",
    messages: [
      {
        id: uid("aimsg_"),
        role: "assistant",
        content:
          "Hi, I'm your HR assistant. Ask me about leave balances, payroll, policies or your pending approvals.",
        createdAt: new Date().toISOString(),
      },
    ],
    lastActiveAt: new Date().toISOString(),
  };
}

function titleFromText(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed || "New conversation";
}

async function currentEmployees(): Promise<Employee[]> {
  const res = await listEmployees();
  return res.data ?? [];
}

function pick<T>(arr: T[], seedNum: number): T {
  return arr[seedNum % arr.length];
}

interface CannedResult {
  content: string;
  sources?: AiSource[];
  unverified?: boolean;
}

async function buildCannedResponse(text: string, ctx: { route: string; role: string }): Promise<CannedResult> {
  const q = text.toLowerCase();
  const employees = await currentEmployees();

  // Sensitive cross-employee salary questions
  if (q.includes("salary")) {
    const mentionsOther = employees.some((e) => {
      const full = `${e.firstName} ${e.lastName}`.toLowerCase();
      return full.length > 2 && q.includes(full);
    });
    if (mentionsOther || /salary of|others?['’]?\s*salary|colleague/.test(q)) {
      return {
        content: "I can only share salary information for your own account. For pay queries about other employees, please contact HR directly.",
      };
    }
  }

  if (q.includes("leave") && (q.includes("balance") || q.includes("left") || q.includes("remaining"))) {
    return {
      content:
        "You currently have 12 days of Annual Leave, 6 days of Sick Leave, and 2 days of Casual Leave remaining for this cycle. Carry-forward is capped at 10 days and lapses on 31 March.",
      sources: [{ label: "My Leave Balances", type: "data_query" }, { label: "Leave Policy 2024", type: "policy_doc" }],
    };
  }

  if (q.includes("payroll") && (q.includes("run") || q.includes("date") || q.includes("when") || q.includes("pay day") || q.includes("salary credited"))) {
    return {
      content:
        "This month's payroll run is scheduled to process on the 28th, with salary credited to accounts by the 1st working day of next month.",
      sources: [{ label: "Payroll Run Schedule", type: "data_query" }],
    };
  }

  if (q.includes("wfh") || q.includes("work from home") || q.includes("remote")) {
    return {
      content:
        "Employees can work from home up to 2 days a week with manager approval, applied at least a day in advance through the attendance module. Fully remote arrangements need HR sign-off.",
      sources: [{ label: "Remote Work Policy", type: "policy_doc" }],
    };
  }

  if (q.includes("pending approval") || (q.includes("approval") && q.includes("my"))) {
    return {
      content:
        "You have 2 items awaiting your approval: 1 leave request from your team and 1 expense claim submitted 3 days ago.",
      sources: [{ label: "Approvals Queue", type: "data_query" }],
    };
  }

  if (q.includes("probation")) {
    return {
      content:
        "Standard probation period is 6 months from the date of joining, with a formal review at the 5-month mark. Extensions of up to 3 months can be requested by the reporting manager.",
      sources: [{ label: "Probation Policy", type: "policy_doc" }],
    };
  }

  if (q.includes("attrition")) {
    return {
      content:
        "Attrition across the org has trended down slightly this quarter. I don't have a source I can cite for the exact percentage right now — please confirm with People Analytics before sharing externally.",
      unverified: true,
    };
  }

  if (q.includes("holiday")) {
    return {
      content: "The next company holiday is listed on your work calendar. Check Settings → Holidays for the full list this year.",
      sources: [{ label: "Holiday Calendar", type: "data_query" }],
    };
  }

  // generic fallback grounded in current route as light context
  return {
    content: `I don't have a specific answer for that yet, but based on where you are (${ctx.route}), you may find relevant details in the related module, or I can help you raise a helpdesk ticket instead.`,
    unverified: true,
  };
}

export const aiApi = {
  async listSessions(employeeId: string): Promise<ApiResponse<AiChatSession[]>> {
    const list = loadSessions()
      .filter((s) => s.employeeId === employeeId)
      .sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt));
    return delay(ok(list), 150);
  },

  async getSession(id: string): Promise<ApiResponse<AiChatSession>> {
    const session = loadSessions().find((s) => s.id === id);
    if (!session) return delay(fail<AiChatSession>("Conversation not found."));
    return delay(ok(session), 100);
  },

  async createSession(employeeId: string): Promise<ApiResponse<AiChatSession>> {
    const session = newSession(employeeId);
    const list = loadSessions();
    saveSessions([session, ...list]);
    return delay(ok(session), 120);
  },

  async sendMessage(
    sessionId: string,
    text: string,
    ctx: { route: string; role: string },
  ): Promise<ApiResponse<AiChatSession>> {
    const trimmed = text.trim();
    if (!trimmed) return delay(fail<AiChatSession>("Type a message first."));

    const now = Date.now();
    const last = lastSendAt.get(sessionId);
    if (last && now - last < 1500) {
      return delay(fail<AiChatSession>("rate_limited"), 40);
    }
    lastSendAt.set(sessionId, now);

    const list = loadSessions();
    const idx = list.findIndex((s) => s.id === sessionId);
    if (idx === -1) return delay(fail<AiChatSession>("Conversation not found."));

    const userMsg: AiChatMessage = {
      id: uid("aimsg_"),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    let assistantMsg: AiChatMessage;
    if (shouldSimulateFailure()) {
      assistantMsg = {
        id: uid("aimsg_"),
        role: "assistant",
        content: "Something went wrong while reaching the AI service. Please try again in a moment.",
        isError: true,
        createdAt: new Date().toISOString(),
      };
    } else {
      const result = await buildCannedResponse(trimmed, ctx);
      assistantMsg = {
        id: uid("aimsg_"),
        role: "assistant",
        content: result.content,
        sources: result.sources,
        unverified: result.unverified,
        createdAt: new Date().toISOString(),
      };
    }

    const session = list[idx];
    const updated: AiChatSession = {
      ...session,
      title: session.messages.filter((m) => m.role === "user").length === 0 ? titleFromText(trimmed) : session.title,
      messages: [...session.messages, userMsg, assistantMsg],
      lastActiveAt: new Date().toISOString(),
    };
    const next = list.slice();
    next[idx] = updated;
    saveSessions(next);
    return delay(ok(updated), 500);
  },

  async clearSession(employeeId: string): Promise<ApiResponse<AiChatSession>> {
    const list = loadSessions().filter((s) => s.employeeId !== employeeId);
    const fresh = newSession(employeeId);
    saveSessions([fresh, ...list]);
    return delay(ok(fresh), 120);
  },

  async setFeedback(sessionId: string, messageId: string, value: AiFeedbackValue): Promise<ApiResponse<AiChatSession>> {
    const list = loadSessions();
    const idx = list.findIndex((s) => s.id === sessionId);
    if (idx === -1) return delay(fail<AiChatSession>("Conversation not found."));
    const updated: AiChatSession = {
      ...list[idx],
      messages: list[idx].messages.map((m) => (m.id === messageId ? { ...m, feedback: value } : m)),
    };
    const next = list.slice();
    next[idx] = updated;
    saveSessions(next);
    return delay(ok(updated), 100);
  },
};

// ───────────────────────── payroll anomalies ─────────────────────────

const ANOMALY_TYPES = [
  { type: "Overtime spike", explanation: "Overtime hours are 3.2x the employee's 6-month average for this run." },
  { type: "Missing deduction", explanation: "Provident fund deduction is absent despite an active enrolment." },
  { type: "Duplicate reimbursement", explanation: "The same travel reimbursement amount appears to have been paid twice in consecutive runs." },
  { type: "Salary jump", explanation: "Gross pay increased by more than 25% without a linked increment record." },
];

let anomalySeeded = false;
async function loadAnomalies(): Promise<PayrollAnomaly[]> {
  const existing = read<PayrollAnomaly[]>(ANOMALIES_KEY, []);
  if (existing.length > 0 || anomalySeeded) return existing;
  anomalySeeded = true;
  const employees = await currentEmployees();
  if (employees.length === 0) return existing;
  const seeded: PayrollAnomaly[] = employees.slice(0, 4).map((e, i) => {
    const a = pick(ANOMALY_TYPES, i);
    return {
      id: uid("anom_"),
      runId: "run_current",
      employeeId: e.id,
      employee: e,
      anomalyType: a.type,
      explanation: a.explanation,
      confidence: i % 2 === 0 ? "high" : "medium",
      status: "open",
    };
  });
  write(ANOMALIES_KEY, seeded);
  return seeded;
}

export async function listPayrollAnomalies(runId: string): Promise<ApiResponse<PayrollAnomaly[]>> {
  const list = await loadAnomalies();
  return delay(ok(list.filter((a) => a.runId === runId || runId === "run_current")), 200);
}

export async function dismissAnomaly(id: string, reason: string): Promise<ApiResponse<PayrollAnomaly[]>> {
  const list = await loadAnomalies();
  const next = list.map((a) =>
    a.id === id ? { ...a, status: "dismissed" as const, dismissedReason: reason, dismissedAt: new Date().toISOString() } : a,
  );
  write(ANOMALIES_KEY, next);
  return delay(ok(next), 150);
}

// ───────────────────────── attendance risk flags ─────────────────────────

const RISK_TYPES: AttendanceRiskType[] = ["chronic_lateness", "rising_absenteeism", "possible_burnout", "irregular_pattern"];
const RISK_RATIONALE: Record<AttendanceRiskType, string> = {
  chronic_lateness: "Clocked in after 10:15 AM on 9 of the last 14 working days.",
  rising_absenteeism: "Unplanned leave frequency has doubled compared to the prior 60-day window.",
  possible_burnout: "Average daily logged hours exceed 10.5 for three consecutive weeks with no leave taken.",
  irregular_pattern: "Clock-in/out times vary by more than 3 hours day-to-day with no approved shift change.",
};

let riskSeeded = false;
async function loadRiskFlags(): Promise<AttendanceRiskFlag[]> {
  const existing = read<AttendanceRiskFlag[]>(RISK_FLAGS_KEY, []);
  if (existing.length > 0 || riskSeeded) return existing;
  riskSeeded = true;
  const employees = await currentEmployees();
  if (employees.length === 0) return existing;
  const seeded: AttendanceRiskFlag[] = employees.slice(0, 5).map((e, i) => ({
    id: uid("risk_"),
    employeeId: e.id,
    employee: e,
    riskType: pick(RISK_TYPES, i),
    rationale: RISK_RATIONALE[pick(RISK_TYPES, i)],
    detectedAt: daysAgo(i + 1),
    status: "open",
  }));
  write(RISK_FLAGS_KEY, seeded);
  return seeded;
}

export async function listAttendanceRiskFlags(opts: { status?: AttendanceRiskFlag["status"] } = {}): Promise<ApiResponse<AttendanceRiskFlag[]>> {
  const list = await loadRiskFlags();
  const filtered = opts.status ? list.filter((r) => r.status === opts.status) : list;
  return delay(ok(filtered.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))), 200);
}

export async function dismissRiskFlag(id: string, reason: string): Promise<ApiResponse<AttendanceRiskFlag[]>> {
  const list = await loadRiskFlags();
  const next = list.map((r) => (r.id === id ? { ...r, status: "dismissed" as const, dismissedReason: reason } : r));
  write(RISK_FLAGS_KEY, next);
  return delay(ok(next), 150);
}

// ───────────────────────── OCR extraction ─────────────────────────

const OCR_FIELDS_BY_TYPE: Record<string, Array<{ fieldKey: string; fieldLabel: string; extractedValue: string; confidence: "high" | "low" }>> = {
  aadhaar: [
    { fieldKey: "name", fieldLabel: "Full name", extractedValue: "Aarav Sharma", confidence: "high" },
    { fieldKey: "dob", fieldLabel: "Date of birth", extractedValue: "1994-03-12", confidence: "high" },
    { fieldKey: "aadhaar_no", fieldLabel: "Aadhaar number", extractedValue: "XXXX XXXX 4821", confidence: "medium" as unknown as "low" },
  ],
  pan: [
    { fieldKey: "name", fieldLabel: "Full name", extractedValue: "AARAV SHARMA", confidence: "high" },
    { fieldKey: "pan_no", fieldLabel: "PAN number", extractedValue: "ABCPS1234D", confidence: "high" },
    { fieldKey: "father_name", fieldLabel: "Father's name", extractedValue: "Rakesh Sharma", confidence: "low" },
  ],
  offer_letter: [
    { fieldKey: "designation", fieldLabel: "Designation", extractedValue: "Software Engineer II", confidence: "high" },
    { fieldKey: "ctc", fieldLabel: "Annual CTC", extractedValue: "₹14,50,000", confidence: "low" },
    { fieldKey: "joining_date", fieldLabel: "Joining date", extractedValue: "2024-01-15", confidence: "low" },
  ],
};

export async function extractOcrFields(documentType: DocumentType): Promise<ApiResponse<OcrExtractionResult>> {
  const fields = OCR_FIELDS_BY_TYPE[documentType] ?? [
    { fieldKey: "value", fieldLabel: "Detected text", extractedValue: "Unable to confidently extract structured fields.", confidence: "low" as const },
  ];
  return delay(ok({ documentType, fields }), 700);
}

// ───────────────────────── draft documents ─────────────────────────

const DRAFT_TEMPLATES: Record<DraftDocumentType, (e: Employee) => string> = {
  offer_letter: (e) =>
    `Dear ${e.firstName} ${e.lastName},\n\nWe are pleased to offer you the position at our company. This letter outlines the key terms of your employment...`,
  appointment_letter: (e) =>
    `Dear ${e.firstName} ${e.lastName},\n\nFurther to your acceptance of our offer, this letter confirms your appointment effective from your date of joining...`,
  experience_letter: (e) =>
    `To Whomsoever It May Concern,\n\nThis is to certify that ${e.firstName} ${e.lastName} was employed with us and served the organisation diligently...`,
  increment_letter: (e) =>
    `Dear ${e.firstName} ${e.lastName},\n\nWe are pleased to inform you of a revision to your compensation, effective from next month...`,
  salary_certificate: (e) =>
    `This is to certify that ${e.firstName} ${e.lastName} is a current employee of our organisation, drawing the salary as per company records...`,
  custom: (e) => `Dear ${e.firstName} ${e.lastName},\n\n[Custom drafted content]`,
};

function loadDrafts(): DraftDocument[] {
  return read<DraftDocument[]>(DRAFTS_KEY, []);
}
function saveDrafts(list: DraftDocument[]) {
  write(DRAFTS_KEY, list);
}

export async function listDraftDocuments(employeeId: string): Promise<ApiResponse<DraftDocument[]>> {
  const list = loadDrafts()
    .filter((d) => d.employeeId === employeeId)
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  return delay(ok(list), 150);
}

export async function generateDraft(input: {
  employeeId: string;
  type: DraftDocumentType;
  sourceTicketId?: string;
}): Promise<ApiResponse<DraftDocument>> {
  const employees = await currentEmployees();
  const employee = employees.find((e) => e.id === input.employeeId);
  if (!employee) return delay(fail<DraftDocument>("Employee not found."));
  const draft: DraftDocument = {
    id: uid("draft_"),
    employeeId: input.employeeId,
    type: input.type,
    sourceTicketId: input.sourceTicketId,
    generatedContent: DRAFT_TEMPLATES[input.type](employee),
    isReviewed: false,
    isSent: false,
    generatedAt: new Date().toISOString(),
  };
  saveDrafts([draft, ...loadDrafts()]);
  return delay(ok(draft), 600);
}

export async function markDraftSent(id: string): Promise<ApiResponse<DraftDocument[]>> {
  const next = loadDrafts().map((d) => (d.id === id ? { ...d, isReviewed: true, isSent: true, sentAt: new Date().toISOString() } : d));
  saveDrafts(next);
  return delay(ok(next), 150);
}
