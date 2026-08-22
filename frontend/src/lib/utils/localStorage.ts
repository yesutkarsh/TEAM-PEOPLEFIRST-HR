/**
 * Storage abstraction for the Form Engine + Candidate Portal.
 * BACKEND: this whole file disappears once the API exists — each function is
 * annotated with the endpoint (or Redis key) that replaces it. Callers import
 * only from here, so swapping to HTTP touches this file alone.
 *
 * Keys:
 *  hrms_form_library   → forms + form_versions tables
 *  hrms_magic_tokens   → Redis "magic_link:{token}"
 *  hrms_candidates     → candidates table
 *  hrms_pipelines      → hiring_pipelines table
 *  hrms_submissions    → candidate_form_submissions table
 *  hrms_portal_session → Redis "portal_session:{sessionId}"
 *  hrms_form_drafts    → candidate_form_submissions (isDraft: true)
 */
import type {
  Candidate,
  CandidateSubmission,
  HiringPipeline,
  MockMagicLinkToken,
  MockPortalSession,
  PipelineAuditEntry,
  PipelineComment,
  PipelineDocument,
  RejectionReason,
  ReviewerAssignment,
  CandidateScore,
} from "../types/candidate";
import type { FormSchema } from "../types/formSchema";

const K = {
  forms: "hrms_form_library",
  tokens: "hrms_magic_tokens",
  candidates: "hrms_candidates",
  pipelines: "hrms_pipelines",
  submissions: "hrms_submissions",
  session: "hrms_portal_session",
  drafts: "hrms_form_drafts",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function shortId(len = 12): string {
  return Math.random().toString(36).slice(2, 2 + len).padEnd(len, "0");
}

/** Single-tenant mock; BACKEND: derived from the authenticated session. */
export const MOCK_TENANT_ID = "tenant_demo";

// ───────────────────────── forms ─────────────────────────

/** BACKEND: GET /api/forms */
export function getLocalForms(): FormSchema[] {
  return read<FormSchema[]>(K.forms, []);
}

/** BACKEND: POST /api/forms or PATCH /api/forms/[id] */
export function saveLocalForm(form: FormSchema): void {
  const list = getLocalForms();
  const i = list.findIndex((f) => f.id === form.id);
  if (i >= 0) list[i] = form;
  else list.unshift(form);
  write(K.forms, list);
}

/** BACKEND: DELETE /api/forms/[id] */
export function deleteLocalForm(id: string): void {
  write(K.forms, getLocalForms().filter((f) => f.id !== id));
}

export function getLocalFormById(id: string): FormSchema | null {
  return getLocalForms().find((f) => f.id === id) ?? null;
}

export function getLocalFormByVersionId(versionId: string): FormSchema | null {
  return getLocalForms().find((f) => f.versionId === versionId) ?? null;
}

// ─────────────────────── candidates ───────────────────────

/** BACKEND: GET /api/candidates */
export function getLocalCandidates(): Candidate[] {
  return read<Candidate[]>(K.candidates, []);
}

/** BACKEND: POST /api/candidates */
export function saveLocalCandidate(c: Candidate): void {
  const list = getLocalCandidates();
  const i = list.findIndex((x) => x.id === c.id);
  if (i >= 0) list[i] = c;
  else list.unshift(c);
  write(K.candidates, list);
}

export function getCandidateById(id: string): Candidate | null {
  return getLocalCandidates().find((c) => c.id === id) ?? null;
}

// ─────────────────────── pipelines ───────────────────────

/** BACKEND: GET /api/candidates/[id] (pipelines included) */
export function getLocalPipelines(): HiringPipeline[] {
  return read<HiringPipeline[]>(K.pipelines, []);
}

/** BACKEND: PATCH /api/candidates/[id]/pipelines/[pipelineId] */
export function saveLocalPipeline(p: HiringPipeline): void {
  const list = getLocalPipelines();
  const i = list.findIndex((x) => x.id === p.id);
  if (i >= 0) list[i] = p;
  else list.unshift(p);
  write(K.pipelines, list);
}

export function getPipelineById(id: string): HiringPipeline | null {
  return getLocalPipelines().find((p) => p.id === id) ?? null;
}

// ────────────────────── submissions ──────────────────────

/** BACKEND: GET /api/candidates/[id]/pipelines/[pipelineId]/submissions */
export function getLocalSubmissions(): CandidateSubmission[] {
  return read<CandidateSubmission[]>(K.submissions, []);
}

/** BACKEND: POST /api/portal/[pipelineId]/submit */
export function saveLocalSubmission(s: CandidateSubmission): void {
  const list = getLocalSubmissions();
  const i = list.findIndex((x) => x.id === s.id);
  if (i >= 0) list[i] = s;
  else list.unshift(s);
  write(K.submissions, list);
}

export function getSubmissionsForPipeline(pipelineId: string): CandidateSubmission[] {
  return getLocalSubmissions()
    .filter((s) => s.pipelineId === pipelineId && !s.isDraft)
    .sort((a, b) => a.submissionNumber - b.submissionNumber);
}

// ────────────────────── magic tokens ──────────────────────

function getTokens(): MockMagicLinkToken[] {
  return read<MockMagicLinkToken[]>(K.tokens, []);
}

/** BACKEND: Redis SET magic_link:{token} EX 259200 */
export function createMagicToken(token: MockMagicLinkToken): void {
  write(K.tokens, [token, ...getTokens().filter((t) => t.pipelineId !== token.pipelineId)]);
}

/** BACKEND: Redis GET magic_link:{token} — null when missing/expired. */
export function validateMagicToken(token: string): MockMagicLinkToken | null {
  const found = getTokens().find((t) => t.token === token);
  if (!found) return null;
  if (new Date(found.expiresAt).getTime() < Date.now()) return null;
  return found;
}

export function getTokenForPipeline(pipelineId: string): MockMagicLinkToken | null {
  return getTokens().find((t) => t.pipelineId === pipelineId) ?? null;
}

/** BACKEND: the Redis token stays usable (email preview panes pre-fetch links). */
export function markTokenUsed(token: string): void {
  write(K.tokens, getTokens().map((t) => (t.token === token ? { ...t, used: true } : t)));
}

// ───────────────────── portal session ─────────────────────

/** BACKEND: Redis SET portal_session:{sessionId} + httpOnly cookie */
export function createPortalSession(session: MockPortalSession): void {
  write(K.session, session);
}

export function getPortalSession(): MockPortalSession | null {
  const s = read<MockPortalSession | null>(K.session, null);
  if (!s) return null;
  // 24h idle expiry, mirroring the Redis TTL.
  if (Date.now() - new Date(s.lastActiveAt).getTime() > 24 * 3600 * 1000) return null;
  return s;
}

export function clearPortalSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(K.session);
}

export function touchPortalSession(): void {
  const s = getPortalSession();
  if (s) write(K.session, { ...s, lastActiveAt: new Date().toISOString() });
}

// ───────────────────────── drafts ─────────────────────────

type DraftMap = Record<string, { values: Record<string, unknown>; savedAt: string }>;

/** BACKEND: GET /api/portal/[pipelineId]/draft */
export function getDraft(pipelineId: string): Record<string, unknown> | null {
  return read<DraftMap>(K.drafts, {})[pipelineId]?.values ?? null;
}

export function getDraftSavedAt(pipelineId: string): string | null {
  return read<DraftMap>(K.drafts, {})[pipelineId]?.savedAt ?? null;
}

/** BACKEND: PATCH /api/portal/[pipelineId]/draft */
export function saveDraft(pipelineId: string, values: Record<string, unknown>): void {
  const all = read<DraftMap>(K.drafts, {});
  all[pipelineId] = { values, savedAt: new Date().toISOString() };
  write(K.drafts, all);
}

export function clearDraft(pipelineId: string): void {
  const all = read<DraftMap>(K.drafts, {});
  delete all[pipelineId];
  write(K.drafts, all);
}
// ═══════════════════ Phase C+D — documents, comments, reviewers, ═══════════════════
// ═══════════════════ scores, rejection reasons, audit log        ═══════════════════

const K2 = {
  documents: "hrms_pipeline_documents",
  comments: "hrms_pipeline_comments",
  reviewers: "hrms_pipeline_reviewers",
  scores: "hrms_pipeline_scores",
  reasons: "hrms_rejection_reasons",
  audit: "hrms_audit_log",
} as const;

// ───────────────────────── documents ─────────────────────────

/** BACKEND: GET /api/candidates/[id]/pipelines/[pid]/documents (metadata only). */
export function getLocalDocuments(pipelineId: string): PipelineDocument[] {
  return read<PipelineDocument[]>(K2.documents, [])
    .filter((d) => d.pipelineId === pipelineId)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

/** BACKEND: POST /api/candidates/[id]/pipelines/[pid]/documents (pre-signed R2 upload first). */
export function saveLocalDocument(doc: PipelineDocument): void {
  const all = read<PipelineDocument[]>(K2.documents, []);
  const i = all.findIndex((d) => d.id === doc.id);
  if (i >= 0) all[i] = doc;
  else all.unshift(doc);
  write(K2.documents, all);
}

/** BACKEND: DELETE /api/candidates/[id]/pipelines/[pid]/documents/[docId] */
export function deleteLocalDocument(docId: string): void {
  write(K2.documents, read<PipelineDocument[]>(K2.documents, []).filter((d) => d.id !== docId));
}

export function getLocalDocumentById(docId: string): PipelineDocument | null {
  return read<PipelineDocument[]>(K2.documents, []).find((d) => d.id === docId) ?? null;
}

// ───────────────────────── comments ─────────────────────────

/** BACKEND: GET /api/candidates/[id]/pipelines/[pid]/comments */
export function getLocalComments(pipelineId: string): PipelineComment[] {
  return read<PipelineComment[]>(K2.comments, [])
    .filter((c) => c.pipelineId === pipelineId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** BACKEND: POST /api/candidates/[id]/pipelines/[pid]/comments */
export function saveLocalComment(comment: PipelineComment): void {
  write(K2.comments, [...read<PipelineComment[]>(K2.comments, []), comment]);
}

/** BACKEND: PATCH .../comments/[id] — 403 unless the requester authored it. */
export function updateLocalComment(id: string, content: string): void {
  write(
    K2.comments,
    read<PipelineComment[]>(K2.comments, []).map((c) =>
      c.id === id ? { ...c, content, isEdited: true, updatedAt: new Date().toISOString() } : c,
    ),
  );
}

/** BACKEND: DELETE .../comments/[id] */
export function deleteLocalComment(id: string): void {
  write(K2.comments, read<PipelineComment[]>(K2.comments, []).filter((c) => c.id !== id));
}

// ────────────────────── reviewer assignments ──────────────────────

/** BACKEND: GET .../reviewers */
export function getLocalReviewers(pipelineId: string): ReviewerAssignment[] {
  return read<ReviewerAssignment[]>(K2.reviewers, []).filter((r) => r.pipelineId === pipelineId);
}

/** BACKEND: POST .../reviewers { reviewerId } — 409 on the unique constraint. */
export function assignLocalReviewer(assignment: ReviewerAssignment): void {
  write(K2.reviewers, [...read<ReviewerAssignment[]>(K2.reviewers, []), assignment]);
}

/** BACKEND: DELETE .../reviewers/[reviewerId] */
export function removeLocalReviewer(id: string): void {
  write(K2.reviewers, read<ReviewerAssignment[]>(K2.reviewers, []).filter((r) => r.id !== id));
}

// ────────────────────── rejection reasons ──────────────────────

const DEFAULT_REASONS: Array<{ label: string; category: RejectionReason["category"] }> = [
  { label: "Skills or experience don't match the role requirements", category: "skills" },
  { label: "Technical assessment did not meet the benchmark", category: "skills" },
  { label: "Not the right cultural fit at this time", category: "culture_fit" },
  { label: "Compensation expectations are misaligned", category: "compensation" },
  { label: "Candidate's availability doesn't match our timeline", category: "timeline" },
  { label: "We've moved forward with another candidate", category: "other" },
];

/** BACKEND: GET /api/settings/hiring/rejection-reasons */
export function getLocalRejectionReasons(): RejectionReason[] {
  return read<RejectionReason[]>(K2.reasons, []).sort((a, b) => a.displayOrder - b.displayOrder);
}

/** BACKEND: POST / PATCH /api/settings/hiring/rejection-reasons */
export function saveLocalRejectionReason(reason: RejectionReason): void {
  const all = read<RejectionReason[]>(K2.reasons, []);
  const i = all.findIndex((r) => r.id === reason.id);
  if (i >= 0) all[i] = reason;
  else all.push(reason);
  write(K2.reasons, all);
}

/** BACKEND: DELETE (soft) /api/settings/hiring/rejection-reasons/[id] */
export function deleteLocalRejectionReason(id: string): void {
  write(K2.reasons, read<RejectionReason[]>(K2.reasons, []).filter((r) => r.id !== id));
}

/** BACKEND: seeded by a migration when a tenant is created (backend Phase A). */
export function seedDefaultRejectionReasons(tenantId: string): void {
  if (read<RejectionReason[]>(K2.reasons, []).length > 0) return;
  write(
    K2.reasons,
    DEFAULT_REASONS.map((r, i) => ({
      id: uuid(),
      tenantId,
      label: r.label,
      category: r.category,
      displayOrder: i,
      isDefault: true,
      isActive: true,
    })),
  );
}

// ───────────────────────── scores ─────────────────────────

/** BACKEND: GET .../scores */
export function getLocalScores(pipelineId: string): CandidateScore[] {
  return read<CandidateScore[]>(K2.scores, []).filter((s) => s.pipelineId === pipelineId);
}

export function getLocalScore(pipelineId: string, reviewerId: string): CandidateScore | null {
  return getLocalScores(pipelineId).find((s) => s.reviewerId === reviewerId) ?? null;
}

/** BACKEND: POST / PATCH .../scores */
export function saveLocalScore(score: CandidateScore): void {
  const all = read<CandidateScore[]>(K2.scores, []);
  const i = all.findIndex((s) => s.pipelineId === score.pipelineId && s.reviewerId === score.reviewerId);
  if (i >= 0) all[i] = score;
  else all.push(score);
  write(K2.scores, all);
}

// ───────────────────────── audit log ─────────────────────────

/** BACKEND: GET .../audit-log?page=1&limit=50 — HR Admin only, never via portal auth. */
export function getLocalAuditLog(pipelineId: string): PipelineAuditEntry[] {
  return read<PipelineAuditEntry[]>(`${K2.audit}_${pipelineId}`, [])
    .slice(0, 100)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Append-only. BACKEND: the server writes audit rows itself (DB trigger on
 * status changes + explicit service calls) — the frontend never posts them.
 */
export function appendAuditEntry(entry: Omit<PipelineAuditEntry, "id" | "createdAt"> & { createdAt?: string }): void {
  const key = `${K2.audit}_${entry.pipelineId}`;
  const list = read<PipelineAuditEntry[]>(key, []);
  list.unshift({ ...entry, id: uuid(), createdAt: entry.createdAt ?? new Date().toISOString() });
  write(key, list.slice(0, 200));
}
