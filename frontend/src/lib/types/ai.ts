/** Phase 10 — AI domain types (chat, anomalies, risk flags, OCR, drafted documents). */
import type { DocumentType, Employee } from "./employee";

export type AiMessageRole = "user" | "assistant";
export type AiSourceType = "policy_doc" | "data_query" | "general_knowledge";
export type AiFeedbackValue = "helpful" | "not_helpful" | null;

export interface AiSource {
  label: string;
  type: AiSourceType;
}

export interface AiChatMessage {
  id: string;
  role: AiMessageRole;
  content: string;
  sources?: AiSource[];
  feedback?: AiFeedbackValue;
  /** true = render as a graceful failure bubble, never a crash */
  isError?: boolean;
  /** data-grounded answer that the backend could not attribute to a source */
  unverified?: boolean;
  createdAt: string;
}

export interface AiChatSession {
  id: string;
  employeeId: string;
  title: string;
  messages: AiChatMessage[];
  lastActiveAt: string;
}

export type AnomalyConfidence = "high" | "medium";
export type AnomalyStatus = "open" | "dismissed" | "reviewed";

export interface PayrollAnomaly {
  id: string;
  runId: string;
  employeeId: string;
  employee: Employee;
  anomalyType: string;
  explanation: string;
  confidence: AnomalyConfidence;
  status: AnomalyStatus;
  dismissedReason?: string;
  dismissedBy?: string;
  dismissedAt?: string;
}

export type AttendanceRiskType =
  | "chronic_lateness"
  | "rising_absenteeism"
  | "possible_burnout"
  | "irregular_pattern";
export type RiskFlagStatus = "open" | "dismissed" | "acknowledged";

export interface AttendanceRiskFlag {
  id: string;
  employeeId: string;
  employee: Employee;
  riskType: AttendanceRiskType;
  rationale: string;
  detectedAt: string;
  status: RiskFlagStatus;
  dismissedReason?: string;
}

export type OcrFieldConfidence = "high" | "low";

export interface OcrExtractedField {
  fieldKey: string;
  fieldLabel: string;
  extractedValue: string;
  confidence: OcrFieldConfidence;
}

export interface OcrExtractionResult {
  documentType: DocumentType;
  fields: OcrExtractedField[];
}

export type DraftDocumentType =
  | "offer_letter"
  | "appointment_letter"
  | "experience_letter"
  | "increment_letter"
  | "salary_certificate"
  | "custom";

export interface DraftDocument {
  id: string;
  employeeId: string;
  type: DraftDocumentType;
  sourceTicketId?: string;
  generatedContent: string;
  isReviewed: boolean;
  isSent: boolean;
  generatedAt: string;
  sentAt?: string;
}

export const DRAFT_DOCUMENT_LABELS: Record<DraftDocumentType, string> = {
  offer_letter: "Offer Letter",
  appointment_letter: "Appointment Letter",
  experience_letter: "Experience Letter",
  increment_letter: "Increment Letter",
  salary_certificate: "Salary Certificate",
  custom: "Custom",
};

export const RISK_LABELS: Record<AttendanceRiskType, string> = {
  chronic_lateness: "Chronic Lateness",
  rising_absenteeism: "Rising Absenteeism",
  possible_burnout: "Possible Burnout",
  irregular_pattern: "Irregular Pattern",
};
