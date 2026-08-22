/**
 * Candidate hiring pipeline types (Phase B).
 * BACKEND mapping:
 *   Candidate           → candidates table
 *   HiringPipeline      → hiring_pipelines table
 *   CandidateSubmission → candidate_form_submissions table
 *   MockMagicLinkToken  → Upstash Redis  "magic_link:{token}"      TTL 72h
 *   MockPortalSession   → Upstash Redis  "portal_session:{sessionId}" TTL 24h idle
 */

export type CandidatePipelineStatus =
  | "invited"
  | "portal_opened"
  | "form_in_progress"
  | "submitted"
  | "changes_requested"
  | "resubmitting"
  | "approved"
  | "offer_pending"
  | "offer_sent"
  | "candidate_signed"
  | "offer_rejected"
  | "countersigned"
  | "onboarding"
  | "converting"
  | "converted"
  | "rejected"
  | "withdrawn"
  | "expired";

export interface Candidate {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  createdAt: string;
  createdBy: string;
}

export interface PipelineEvent {
  id: string;
  at: string;
  label: string;
  actor?: string;
}

export interface HiringPipeline {
  id: string;
  tenantId: string;
  candidateId: string;
  formId: string | null;
  formVersionId: string | null;
  roleName?: string;
  status: CandidatePipelineStatus;
  invitedAt: string;
  invitedBy: string;
  expiresAt: string;
  hrNotes?: string;
  changeRequestNote?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReasonId?: string;
  rejectionReasonLabel?: string;
  convertedEmployeeId?: string;
  lastActivityAt: string;
  /** Frontend-only convenience; BACKEND: pipeline_events table / audit log. */
  events: PipelineEvent[];
}

export interface CandidateSubmission {
  id: string;
  pipelineId: string;
  submissionNumber: number;
  formVersionId: string | null;
  responses: Record<string, unknown>;
  submittedAt: string;
  isDraft: boolean;
}

/** FRONTEND ONLY — replaced by Upstash Redis in the backend. */
export interface MockMagicLinkToken {
  token: string;
  pipelineId: string;
  candidateId: string;
  tenantId: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}

/** FRONTEND ONLY — replaced by Upstash Redis in the backend. */
export interface MockPortalSession {
  sessionId: string;
  pipelineId: string;
  candidateId: string;
  tenantId: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface CandidateRow {
  candidate: Candidate;
  pipeline: HiringPipeline;
}

export const CANDIDATE_STATUS_LABELS: Record<CandidatePipelineStatus, string> = {
  invited: "Invited",
  portal_opened: "Link opened",
  form_in_progress: "In progress",
  submitted: "Under review",
  changes_requested: "Changes needed",
  resubmitting: "Resubmitting",
  approved: "Approved",
  offer_pending: "Offer pending",
  offer_sent: "Offer sent",
  candidate_signed: "Offer signed",
  offer_rejected: "Offer declined",
  countersigned: "Countersigned",
  onboarding: "Onboarding",
  converting: "Converting",
  converted: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  expired: "Link expired",
};

export const TERMINAL_STATUSES: CandidatePipelineStatus[] = [
  "converted",
  "rejected",
  "withdrawn",
  "offer_rejected",
];

export interface StepDefinition {
  id: string;
  label: string;
  description: string;
  completedStatuses: CandidatePipelineStatus[];
  activeStatuses: CandidatePipelineStatus[];
  route: ((pipelineId: string) => string) | null;
}

export const STEP_DEFINITIONS: StepDefinition[] = [
  {
    id: "application",
    label: "Candidate Application",
    description: "Fill in your information",
    completedStatuses: [
      "submitted",
      "changes_requested",
      "resubmitting",
      "approved",
      "offer_pending",
      "offer_sent",
      "candidate_signed",
      "countersigned",
      "onboarding",
      "converted",
    ],
    activeStatuses: ["portal_opened", "form_in_progress"],
    route: (pipelineId) => `/portal/${pipelineId}/form`,
  },
  {
    id: "hr_review",
    label: "HR Review",
    description: "Your application is being reviewed",
    completedStatuses: [
      "approved",
      "offer_pending",
      "offer_sent",
      "candidate_signed",
      "countersigned",
      "onboarding",
      "converted",
    ],
    activeStatuses: ["submitted", "changes_requested", "resubmitting"],
    route: null,
  },
  {
    id: "offer_letter",
    label: "Offer Letter",
    description: "Review and sign your offer",
    completedStatuses: ["candidate_signed", "countersigned", "onboarding", "converted"],
    activeStatuses: ["offer_sent"],
    route: (pipelineId) => `/portal/${pipelineId}/offer`,
  },
  {
    id: "joining",
    label: "Joining",
    description: "Welcome to the team!",
    completedStatuses: ["converted"],
    activeStatuses: ["onboarding", "countersigned"],
    route: null,
  },
];
// ════════════════════════ Phase C+D ════════════════════════

/**
 * BACKEND: pipeline_documents table
 * Columns: id, pipeline_id, tenant_id, uploaded_by, file_name, file_type,
 *          file_size_bytes, storage_url (R2), document_type, label,
 *          uploaded_at, is_verified, verified_by, verified_at
 */
export type PipelineDocumentType = "id_proof" | "resume" | "portfolio" | "certificate" | "other";

export interface PipelineDocument {
  id: string;
  pipelineId: string;
  uploadedBy: "candidate" | "hr";
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  /** base64 data URI for the mock. BACKEND: replaced by a fresh signed R2 URL (1h TTL). */
  fileData: string;
  documentType: PipelineDocumentType;
  label: string;
  uploadedAt: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
}

/** BACKEND: pipeline_comments table — HR-only, never exposed to the candidate portal. */
export interface PipelineComment {
  id: string;
  pipelineId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  isEdited: boolean;
}

/** BACKEND: pipeline_reviewer_assignments table (unique on pipeline_id + reviewer_id). */
export interface ReviewerAssignment {
  id: string;
  pipelineId: string;
  reviewerId: string;
  reviewerName: string;
  assignedAt: string;
  assignedBy: string;
}

export type RejectionReasonCategory = "skills" | "culture_fit" | "compensation" | "timeline" | "other";

/** BACKEND: rejection_reasons table (tenant-level library, soft delete via is_active). */
export interface RejectionReason {
  id: string;
  tenantId: string;
  label: string;
  category: RejectionReasonCategory;
  displayOrder: number;
  isDefault: boolean;
  isActive: boolean;
}

export const REJECTION_CATEGORY_LABELS: Record<RejectionReasonCategory, string> = {
  skills: "Skills & Experience",
  culture_fit: "Culture Fit",
  compensation: "Compensation",
  timeline: "Timeline",
  other: "Other",
};

/** BACKEND: pipeline_scores table. */
export interface CandidateScore {
  id: string;
  pipelineId: string;
  reviewerId: string;
  reviewerName: string;
  overallScore: number; // 1–5
  notes?: string;
  scoredAt: string;
}

export type AuditAction =
  | "invited"
  | "link_opened"
  | "form_started"
  | "draft_saved"
  | "form_submitted"
  | "status_changed"
  | "changes_requested"
  | "comment_added"
  | "comment_edited"
  | "comment_deleted"
  | "document_uploaded"
  | "document_verified"
  | "document_deleted"
  | "reviewer_assigned"
  | "reviewer_removed"
  | "score_added"
  | "invitation_resent"
  | "link_expired"
  | "rejected"
  | "withdrawn"
  | "offer_generated"
  | "offer_sent"
  | "candidate_signed"
  | "offer_rejected"
  | "countersigned"
  | "conversion_started"
  | "converted";

/** BACKEND: pipeline_audit_log table — append-only, never updated or deleted. */
export interface PipelineAuditEntry {
  id: string;
  pipelineId: string;
  actorId: string;
  actorName: string;
  actorType: "hr" | "candidate" | "system";
  action: AuditAction;
  details: Record<string, unknown>;
  createdAt: string;
}
