/** Candidate hiring pipeline API — localStorage backed (frontend-only mock). */
import type { ApiResponse } from "../types/api";
import type {
  Candidate,
  CandidatePipelineStatus,
  CandidateRow,
  CandidateSubmission,
  HiringPipeline,
  MockPortalSession,
} from "../types/candidate";
import { TERMINAL_STATUSES } from "../types/candidate";
import {
  MOCK_TENANT_ID,
  createMagicToken,
  createPortalSession,
  clearDraft,
  getCandidateById,
  getLocalCandidates,
  getLocalPipelines,
  getPipelineById,
  getSubmissionsForPipeline,
  getTokenForPipeline,
  markTokenUsed,
  saveLocalCandidate,
  saveLocalPipeline,
  saveLocalSubmission,
  shortId,
  uuid,
  validateMagicToken,
} from "../utils/localStorage";
import { delay, fail, ok } from "./client";

const iso = () => new Date().toISOString();

function event(label: string, actor?: string) {
  return { id: shortId(8), at: iso(), label, actor };
}

function touch(p: HiringPipeline, label: string, actor?: string, patch: Partial<HiringPipeline> = {}) {
  const next: HiringPipeline = {
    ...p,
    ...patch,
    lastActivityAt: iso(),
    events: [...p.events, event(label, actor)],
  };
  saveLocalPipeline(next);
  return next;
}

/** Phase C+D: mirrors every pipeline mutation into the append-only audit log. */
function auditPipeline(
  pipelineId: string,
  action: string,
  details: Record<string, unknown>,
  actorName: string,
  actorType: "hr" | "candidate" | "system",
) {
  void import("../utils/localStorage").then(({ appendAuditEntry }) =>
    appendAuditEntry({
      pipelineId,
      actorId: actorType === "hr" ? "hr_admin" : actorType,
      actorName,
      actorType,
      action: action as never,
      details,
    }),
  );
}

function withExpiry(p: HiringPipeline): HiringPipeline {
  if (p.status === "invited" && new Date(p.expiresAt).getTime() < Date.now()) {
    return { ...p, status: "expired" };
  }
  return p;
}

export function magicLinkUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/portal?token=${token}`;
}

export const EXPIRY_OPTIONS = [
  { label: "24 hours", hours: 24 },
  { label: "48 hours", hours: 48 },
  { label: "72 hours", hours: 72 },
  { label: "7 days", hours: 168 },
];

export interface InviteInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roleName?: string;
  formId: string | null;
  expiryHours: number;
  hrNotes?: string;
  invitedBy?: string;
  /** set true to bypass the duplicate-email guard */
  allowDuplicate?: boolean;
}

export const candidatesApi = {
  /** BACKEND: GET /api/candidates — one row per pipeline. */
  async list(): Promise<ApiResponse<CandidateRow[]>> {
    const candidates = getLocalCandidates();
    const rows = getLocalPipelines()
      .map(withExpiry)
      .map((pipeline) => {
        const candidate = candidates.find((c) => c.id === pipeline.candidateId);
        return candidate ? { candidate, pipeline } : null;
      })
      .filter((r): r is CandidateRow => r !== null)
      .sort((a, b) => b.pipeline.invitedAt.localeCompare(a.pipeline.invitedAt));
    return delay(ok(rows));
  },

  /** BACKEND: GET /api/candidates/[id] */
  async get(candidateId: string): Promise<ApiResponse<{ candidate: Candidate; pipelines: HiringPipeline[] }>> {
    const candidate = getCandidateById(candidateId);
    if (!candidate) return delay(fail("Candidate not found.", "not_found"));
    const pipelines = getLocalPipelines()
      .filter((p) => p.candidateId === candidateId)
      .map(withExpiry)
      .sort((a, b) => b.invitedAt.localeCompare(a.invitedAt));
    return delay(ok({ candidate, pipelines }));
  },

  findByEmail(email: string): Candidate | null {
    return getLocalCandidates().find((c) => c.email.toLowerCase() === email.trim().toLowerCase()) ?? null;
  },

  submissions(pipelineId: string): CandidateSubmission[] {
    return getSubmissionsForPipeline(pipelineId);
  },

  /**
   * BACKEND: POST /api/candidates/invite — creates candidate + pipeline,
   * writes a nanoid(64) token to Redis with TTL, emails the portal link via Resend.
   */
  async invite(
    input: InviteInput,
  ): Promise<ApiResponse<{ candidateId: string; pipelineId: string; magicLinkUrl: string; expiresAt: string }>> {
    if (!input.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))
      return delay(fail("Enter a valid email address."));
    if (!input.firstName.trim()) return delay(fail("First name is required."));

    const existing = candidatesApi.findByEmail(input.email);
    if (existing && !input.allowDuplicate) {
      const clash = getLocalPipelines().find(
        (p) => p.candidateId === existing.id && (p.roleName ?? "") === (input.roleName ?? ""),
      );
      if (clash) return delay(fail("DUPLICATE:" + existing.id, "duplicate"));
    }

    const candidate: Candidate = existing ?? {
      id: uuid(),
      tenantId: MOCK_TENANT_ID,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim(),
      phone: input.phone,
      createdAt: iso(),
      createdBy: input.invitedBy ?? "HR Admin",
    };
    saveLocalCandidate(candidate);

    const expiresAt = new Date(Date.now() + input.expiryHours * 3600 * 1000).toISOString();
    const form = input.formId
      ? (await import("../utils/localStorage")).getLocalFormById(input.formId)
      : null;

    const pipeline: HiringPipeline = {
      id: uuid(),
      tenantId: MOCK_TENANT_ID,
      candidateId: candidate.id,
      formId: input.formId,
      formVersionId: form?.versionId ?? null,
      roleName: input.roleName,
      status: "invited",
      invitedAt: iso(),
      invitedBy: input.invitedBy ?? "HR Admin",
      expiresAt,
      hrNotes: input.hrNotes,
      lastActivityAt: iso(),
      events: [event("Invitation sent", input.invitedBy ?? "HR Admin")],
    };
    saveLocalPipeline(pipeline);
    auditPipeline(pipeline.id, "invited", { roleName: input.roleName }, pipeline.invitedBy, "hr");

    const token = uuid();
    createMagicToken({
      token,
      pipelineId: pipeline.id,
      candidateId: candidate.id,
      tenantId: MOCK_TENANT_ID,
      createdAt: iso(),
      expiresAt,
      used: false,
    });

    return delay(
      ok({ candidateId: candidate.id, pipelineId: pipeline.id, magicLinkUrl: magicLinkUrl(token), expiresAt }),
    );
  },

  /** BACKEND: POST /api/candidates/[id]/pipelines/[pid]/resend-invitation */
  async resendInvitation(pipelineId: string, expiryHours = 72): Promise<ApiResponse<{ magicLinkUrl: string }>> {
    const p = getPipelineById(pipelineId);
    if (!p) return delay(fail("Pipeline not found."));
    const expiresAt = new Date(Date.now() + expiryHours * 3600 * 1000).toISOString();
    const token = uuid();
    createMagicToken({
      token,
      pipelineId: p.id,
      candidateId: p.candidateId,
      tenantId: p.tenantId,
      createdAt: iso(),
      expiresAt,
      used: false,
    });
    touch(p, "Invitation resent", "HR Admin", { status: "invited", expiresAt });
    auditPipeline(p.id, "invitation_resent", {}, "HR Admin", "hr");
    return delay(ok({ magicLinkUrl: magicLinkUrl(token) }));
  },

  currentMagicLink(pipelineId: string): { url: string; expiresAt: string } | null {
    const t = getTokenForPipeline(pipelineId);
    return t ? { url: magicLinkUrl(t.token), expiresAt: t.expiresAt } : null;
  },

  /** BACKEND: PATCH /api/candidates/[id]/pipelines/[pid] */
  async setStatus(
    pipelineId: string,
    status: CandidatePipelineStatus,
    label: string,
    patch: Partial<HiringPipeline> = {},
    actor = "HR Admin",
  ): Promise<ApiResponse<HiringPipeline>> {
    const p = getPipelineById(pipelineId);
    if (!p) return delay(fail<HiringPipeline>("Pipeline not found."));
    if (status !== p.status)
      auditPipeline(pipelineId, "status_changed", { from: p.status, to: status, label }, actor, "hr");
    return delay(ok(touch(p, label, actor, { status, ...patch })));
  },

  async approve(pipelineId: string) {
    return candidatesApi.setStatus(pipelineId, "approved", "Application approved", {
      reviewedAt: iso(),
      reviewedBy: "HR Admin",
    });
  },

  async requestChanges(pipelineId: string, changeRequestNote: string, hrNotes?: string) {
    auditPipeline(pipelineId, "changes_requested", { note: changeRequestNote }, "HR Admin", "hr");
    return candidatesApi.setStatus(pipelineId, "changes_requested", "Changes requested", {
      changeRequestNote,
      ...(hrNotes !== undefined ? { hrNotes } : {}),
    });
  },

  async reject(pipelineId: string, reason: string) {
    return candidatesApi.setStatus(pipelineId, "rejected", `Candidate rejected — ${reason}`, { hrNotes: reason });
  },

  async withdraw(pipelineId: string) {
    return candidatesApi.setStatus(pipelineId, "withdrawn", "Pipeline cancelled");
  },

  /** Phase F stub — real conversion creates the employee record transactionally. */
  async convert(pipelineId: string) {
    return candidatesApi.setStatus(pipelineId, "onboarding", "Moved to employee onboarding");
  },

  async saveHrNotes(pipelineId: string, hrNotes: string): Promise<ApiResponse<HiringPipeline>> {
    const p = getPipelineById(pipelineId);
    if (!p) return delay(fail<HiringPipeline>("Pipeline not found."));
    const next = { ...p, hrNotes, lastActivityAt: iso() };
    saveLocalPipeline(next);
    return delay(ok(next));
  },
};

// ───────────────────────── portal side ─────────────────────────

export const portalApi = {
  /** BACKEND: POST /api/portal/auth { token } — validates Redis token, sets httpOnly cookie. */
  async authenticate(token: string): Promise<ApiResponse<{ pipelineId: string }>> {
    const record = validateMagicToken(token);
    if (!record) return delay(fail("This invitation link has expired.", "expired"));
    const pipeline = getPipelineById(record.pipelineId);
    if (!pipeline) return delay(fail("This invitation is no longer valid.", "not_found"));

    const session: MockPortalSession = {
      sessionId: uuid(),
      pipelineId: record.pipelineId,
      candidateId: record.candidateId,
      tenantId: record.tenantId,
      createdAt: iso(),
      lastActiveAt: iso(),
    };
    createPortalSession(session);
    markTokenUsed(token);
    if (pipeline.status === "invited" || pipeline.status === "expired") {
      touch(pipeline, "Link opened", undefined, { status: "portal_opened" });
      auditPipeline(pipeline.id, "link_opened", {}, "Candidate", "candidate");
    }
    return delay(ok({ pipelineId: record.pipelineId }));
  },

  /** BACKEND: GET /api/portal/[pipelineId] — HR-only fields stripped server-side. */
  async getPipeline(
    pipelineId: string,
  ): Promise<ApiResponse<{ pipeline: HiringPipeline; candidate: Candidate | null }>> {
    const p = getPipelineById(pipelineId);
    if (!p) return delay(fail("Pipeline not found.", "not_found"));
    const safe: HiringPipeline = { ...p, hrNotes: undefined };
    return delay(ok({ pipeline: safe, candidate: getCandidateById(p.candidateId) }));
  },

  markFormStarted(pipelineId: string) {
    const p = getPipelineById(pipelineId);
    if (p && p.status === "portal_opened") {
      touch(p, "Form started", undefined, { status: "form_in_progress" });
      auditPipeline(p.id, "form_started", {}, "Candidate", "candidate");
    }
  },

  /** BACKEND: POST /api/portal/[pipelineId]/submit — revalidates every visible field. */
  async submit(
    pipelineId: string,
    responses: Record<string, unknown>,
  ): Promise<ApiResponse<{ submissionId: string }>> {
    const p = getPipelineById(pipelineId);
    if (!p) return delay(fail("Pipeline not found."));
    const previous = getSubmissionsForPipeline(pipelineId);
    const submission: CandidateSubmission = {
      id: uuid(),
      pipelineId,
      submissionNumber: previous.length + 1,
      formVersionId: p.formVersionId,
      responses,
      submittedAt: iso(),
      isDraft: false,
    };
    saveLocalSubmission(submission);
    clearDraft(pipelineId);
    touch(p, previous.length ? "Application resubmitted" : "Form submitted", undefined, { status: "submitted" });
    auditPipeline(p.id, "form_submitted", { submissionNumber: submission.submissionNumber }, "Candidate", "candidate");
    return delay(ok({ submissionId: submission.id }));
  },
};
// ═══════════════════════ Phase C+D — review workflow ═══════════════════════

import type {
  AuditAction,
  CandidateScore,
  PipelineAuditEntry,
  PipelineComment,
  PipelineDocument,
  RejectionReason,
  RejectionReasonCategory,
  ReviewerAssignment,
} from "../types/candidate";
import {
  appendAuditEntry,
  assignLocalReviewer,
  deleteLocalComment,
  deleteLocalDocument,
  deleteLocalRejectionReason,
  getLocalAuditLog,
  getLocalComments,
  getLocalDocuments,
  getLocalRejectionReasons,
  getLocalReviewers,
  getLocalScore,
  getLocalScores,
  removeLocalReviewer,
  saveLocalComment,
  saveLocalDocument,
  saveLocalRejectionReason,
  saveLocalScore,
  seedDefaultRejectionReasons,
  updateLocalComment,
} from "../utils/localStorage";

export interface Actor {
  id: string;
  name: string;
}

const HR: Actor = { id: "hr_admin", name: "HR Admin" };

function audit(
  pipelineId: string,
  action: AuditAction,
  details: Record<string, unknown> = {},
  actor: Actor = HR,
  actorType: PipelineAuditEntry["actorType"] = "hr",
) {
  appendAuditEntry({ pipelineId, actorId: actor.id, actorName: actor.name, actorType, action, details });
}

/** Exposed so the portal + pipeline mutations can record their own entries. */
export const recordAudit = audit;

export const reviewApi = {
  // ───────── documents ─────────
  documents(pipelineId: string): PipelineDocument[] {
    return getLocalDocuments(pipelineId);
  },

  /** BACKEND: pre-signed R2 upload, then POST .../documents { storageKey, … }. */
  async uploadDocument(
    pipelineId: string,
    input: {
      fileName: string;
      fileType: string;
      fileSizeBytes: number;
      fileData: string;
      documentType: PipelineDocument["documentType"];
      label: string;
      uploadedBy?: PipelineDocument["uploadedBy"];
    },
    actor: Actor = HR,
  ): Promise<ApiResponse<PipelineDocument>> {
    if (!input.label.trim()) return delay(fail<PipelineDocument>("Add a label for this document."));
    const doc: PipelineDocument = {
      id: uuid(),
      pipelineId,
      uploadedBy: input.uploadedBy ?? "hr",
      fileName: input.fileName,
      fileType: input.fileType,
      fileSizeBytes: input.fileSizeBytes,
      fileData: input.fileData,
      documentType: input.documentType,
      label: input.label.trim(),
      uploadedAt: iso(),
      isVerified: false,
    };
    saveLocalDocument(doc);
    audit(pipelineId, "document_uploaded", { label: doc.label }, actor);
    return delay(ok(doc));
  },

  /** BACKEND: PATCH .../documents/[docId]/verify */
  async setDocumentVerified(doc: PipelineDocument, verified: boolean, actor: Actor = HR): Promise<ApiResponse<PipelineDocument>> {
    const next: PipelineDocument = verified
      ? { ...doc, isVerified: true, verifiedBy: actor.id, verifiedAt: iso() }
      : { ...doc, isVerified: false, verifiedBy: undefined, verifiedAt: undefined };
    saveLocalDocument(next);
    if (verified) audit(doc.pipelineId, "document_verified", { label: doc.label }, actor);
    return delay(ok(next));
  },

  /** BACKEND: DELETE .../documents/[docId] */
  async deleteDocument(doc: PipelineDocument, actor: Actor = HR): Promise<ApiResponse<true>> {
    deleteLocalDocument(doc.id);
    audit(doc.pipelineId, "document_deleted", { label: doc.label }, actor);
    return delay(ok(true as const));
  },

  // ───────── comments ─────────
  comments(pipelineId: string): PipelineComment[] {
    return getLocalComments(pipelineId);
  },

  /** BACKEND: POST .../comments { content } */
  async addComment(pipelineId: string, content: string, actor: Actor = HR): Promise<ApiResponse<PipelineComment>> {
    const trimmed = content.trim();
    if (!trimmed) return delay(fail<PipelineComment>("Comment cannot be empty"));
    const comment: PipelineComment = {
      id: uuid(),
      pipelineId,
      authorId: actor.id,
      authorName: actor.name,
      content: trimmed,
      createdAt: iso(),
      isEdited: false,
    };
    saveLocalComment(comment);
    audit(pipelineId, "comment_added", {}, actor);
    return delay(ok(comment));
  },

  /** BACKEND: PATCH .../comments/[id] — 403 unless the requester is the author. */
  async editComment(comment: PipelineComment, content: string, actor: Actor = HR): Promise<ApiResponse<true>> {
    const trimmed = content.trim();
    if (!trimmed) return delay(fail<true>("Comment cannot be empty"));
    updateLocalComment(comment.id, trimmed);
    audit(comment.pipelineId, "comment_edited", {}, actor);
    return delay(ok(true as const));
  },

  async deleteComment(comment: PipelineComment, actor: Actor = HR): Promise<ApiResponse<true>> {
    deleteLocalComment(comment.id);
    audit(comment.pipelineId, "comment_deleted", {}, actor);
    return delay(ok(true as const));
  },

  // ───────── reviewers ─────────
  reviewers(pipelineId: string): ReviewerAssignment[] {
    return getLocalReviewers(pipelineId);
  },

  /** BACKEND: POST .../reviewers — 409 Conflict on duplicates; notifies the reviewer. */
  async assignReviewer(
    pipelineId: string,
    reviewer: { id: string; name: string },
    actor: Actor = HR,
  ): Promise<ApiResponse<ReviewerAssignment>> {
    if (getLocalReviewers(pipelineId).some((r) => r.reviewerId === reviewer.id))
      return delay(fail<ReviewerAssignment>("Already assigned as a reviewer.", "conflict"));
    const assignment: ReviewerAssignment = {
      id: uuid(),
      pipelineId,
      reviewerId: reviewer.id,
      reviewerName: reviewer.name,
      assignedAt: iso(),
      assignedBy: actor.id,
    };
    assignLocalReviewer(assignment);
    audit(pipelineId, "reviewer_assigned", { reviewerName: reviewer.name }, actor);
    // BACKEND: POST /api/notifications { type: 'general', title: 'Candidate review assigned', … }
    console.log("[NOTIFY] Review assignment queued for", reviewer.name);
    return delay(ok(assignment));
  },

  async removeReviewer(assignment: ReviewerAssignment, actor: Actor = HR): Promise<ApiResponse<true>> {
    removeLocalReviewer(assignment.id);
    audit(assignment.pipelineId, "reviewer_removed", { reviewerName: assignment.reviewerName }, actor);
    return delay(ok(true as const));
  },

  // ───────── scores ─────────
  scores(pipelineId: string): CandidateScore[] {
    return getLocalScores(pipelineId);
  },

  myScore(pipelineId: string, reviewerId: string): CandidateScore | null {
    return getLocalScore(pipelineId, reviewerId);
  },

  /** BACKEND: POST / PATCH .../scores { overallScore, notes } */
  async saveScore(
    pipelineId: string,
    overallScore: number,
    notes: string | undefined,
    actor: Actor = HR,
  ): Promise<ApiResponse<CandidateScore>> {
    if (overallScore < 1 || overallScore > 5) return delay(fail<CandidateScore>("Pick a rating from 1 to 5."));
    const existing = getLocalScore(pipelineId, actor.id);
    const score: CandidateScore = {
      id: existing?.id ?? uuid(),
      pipelineId,
      reviewerId: actor.id,
      reviewerName: actor.name,
      overallScore,
      notes: notes?.trim() || undefined,
      scoredAt: iso(),
    };
    saveLocalScore(score);
    audit(pipelineId, "score_added", { score: overallScore }, actor);
    return delay(ok(score));
  },

  // ───────── rejection reasons ─────────
  rejectionReasons(tenantId = MOCK_TENANT_ID): RejectionReason[] {
    seedDefaultRejectionReasons(tenantId);
    return getLocalRejectionReasons();
  },

  async saveRejectionReason(input: {
    id?: string;
    label: string;
    category: RejectionReasonCategory;
    isActive?: boolean;
  }): Promise<ApiResponse<RejectionReason>> {
    if (!input.label.trim()) return delay(fail<RejectionReason>("Reason text is required."));
    const all = getLocalRejectionReasons();
    const existing = input.id ? all.find((r) => r.id === input.id) : undefined;
    const reason: RejectionReason = {
      id: existing?.id ?? uuid(),
      tenantId: MOCK_TENANT_ID,
      label: input.label.trim(),
      category: input.category,
      displayOrder: existing?.displayOrder ?? all.length,
      isDefault: existing?.isDefault ?? false,
      isActive: input.isActive ?? existing?.isActive ?? true,
    };
    saveLocalRejectionReason(reason);
    return delay(ok(reason));
  },

  /** Blocked when the reason is referenced by any pipeline (BACKEND: soft delete instead). */
  reasonUsageCount(reasonId: string): number {
    return getLocalPipelines().filter((p) => p.rejectionReasonId === reasonId).length;
  },

  async deleteRejectionReason(id: string): Promise<ApiResponse<true>> {
    const used = reviewApi.reasonUsageCount(id);
    if (used > 0)
      return delay(
        fail<true>(`This reason was used for ${used} candidate${used === 1 ? "" : "s"} and cannot be deleted. You can hide it instead.`),
      );
    deleteLocalRejectionReason(id);
    return delay(ok(true as const));
  },

  // ───────── rejection + bulk ─────────
  /** BACKEND: PATCH .../pipelines/[pid] { status:'rejected', rejectionReasonId, hrNotes } */
  async rejectWithReason(
    pipelineId: string,
    reason: { id?: string; label: string },
    internalNotes?: string,
    actor: Actor = HR,
  ): Promise<ApiResponse<HiringPipeline>> {
    const r = await candidatesApi.setStatus(
      pipelineId,
      "rejected",
      `Candidate rejected — ${reason.label}`,
      {
        rejectionReasonId: reason.id,
        rejectionReasonLabel: reason.label,
        ...(internalNotes ? { hrNotes: internalNotes } : {}),
      },
      actor.name,
    );
    if (r.data) {
      audit(pipelineId, "rejected", { reason: reason.label }, actor);
      // BACKEND: sends the rejection email via Resend + POST /api/notifications.
      console.log("[NOTIFY] Rejection notification queued for pipeline", pipelineId);
    }
    return r;
  },

  /** BACKEND: POST /api/candidates/bulk-reject — one transaction, one audit row per pipeline. */
  async bulkReject(
    pipelineIds: string[],
    reason: { id?: string; label: string },
    internalNotes?: string,
    actor: Actor = HR,
  ): Promise<ApiResponse<{ processed: number; skipped: number }>> {
    let processed = 0;
    let skipped = 0;
    for (const id of pipelineIds) {
      const p = getPipelineById(id);
      if (!p || TERMINAL_STATUSES.includes(p.status)) {
        skipped += 1;
        continue;
      }
      await reviewApi.rejectWithReason(id, reason, internalNotes, actor);
      processed += 1;
    }
    return delay(ok({ processed, skipped }));
  },

  /** BACKEND: POST /api/candidates/bulk-assign-reviewer */
  async bulkAssignReviewer(
    pipelineIds: string[],
    reviewer: { id: string; name: string },
    actor: Actor = HR,
  ): Promise<ApiResponse<{ processed: number; skipped: number }>> {
    let processed = 0;
    let skipped = 0;
    for (const id of pipelineIds) {
      const r = await reviewApi.assignReviewer(id, reviewer, actor);
      if (r.data) processed += 1;
      else skipped += 1;
    }
    return delay(ok({ processed, skipped }));
  },

  // ───────── audit log ─────────
  auditLog(pipelineId: string): PipelineAuditEntry[] {
    return getLocalAuditLog(pipelineId);
  },
};
