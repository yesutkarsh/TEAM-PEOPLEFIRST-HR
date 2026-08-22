/**
 * FRONTEND ONLY — seeds a demo hiring pipeline set so the review workflow has data.
 * BACKEND: delete this file; the API returns real rows.
 */
import type {
  Candidate,
  CandidateSubmission,
  HiringPipeline,
  PipelineComment,
  PipelineDocument,
} from "../types/candidate";
import type { FormSchema } from "../types/formSchema";
import {
  MOCK_TENANT_ID,
  appendAuditEntry,
  assignLocalReviewer,
  getLocalCandidates,
  getLocalForms,
  saveLocalCandidate,
  saveLocalComment,
  saveLocalDocument,
  saveLocalForm,
  saveLocalPipeline,
  saveLocalScore,
  saveLocalSubmission,
  seedDefaultRejectionReasons,
  uuid,
} from "../utils/localStorage";

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString();

function demoForm(): FormSchema {
  const now = iso(30);
  return {
    id: "form_demo_candidate",
    version: 1,
    versionId: "formv_demo_candidate_1",
    title: "Candidate application",
    description: "Basic details we collect before an interview.",
    category: "candidate_onboarding",
    status: "published",
    isMultiStep: false,
    steps: [
      {
        id: "step_1",
        title: "About you",
        fields: [
          { id: "f_full_name", type: "short_text", label: "Full name", required: true, validation: [], displayOrder: 0 },
          { id: "f_experience", type: "number", label: "Years of experience", required: true, validation: [], displayOrder: 1 },
          { id: "f_current_ctc", type: "number", label: "Current CTC (LPA)", required: false, validation: [], displayOrder: 2 },
          { id: "f_notice", type: "short_text", label: "Notice period", required: true, validation: [], displayOrder: 3 },
          { id: "f_why", type: "long_text", label: "Why this role?", required: false, validation: [], displayOrder: 4 },
        ],
      },
    ],
    settings: {
      allowDraftSaving: true,
      showProgressBar: true,
      submitButtonLabel: "Submit application",
      successMessage: "Thanks! We'll be in touch shortly.",
    },
    allowedRoleIds: [],
    createdBy: "HR Admin",
    createdAt: now,
    updatedAt: now,
  };
}

interface Spec {
  first: string;
  last: string;
  email: string;
  phone: string;
  role: string;
  status: HiringPipeline["status"];
  invitedDaysAgo: number;
  responses?: Record<string, unknown>;
  secondSubmission?: Record<string, unknown>;
  score?: { name: string; value: number; notes: string };
  comments?: string[];
}

const SPECS: Spec[] = [
  {
    first: "Priya", last: "Nair", email: "priya.nair@example.com", phone: "+91 98200 11223",
    role: "Senior Frontend Engineer", status: "submitted", invitedDaysAgo: 9,
    responses: { f_full_name: "Priya Nair", f_experience: 7, f_current_ctc: 32, f_notice: "60 days", f_why: "I want to work on design-led product surfaces at scale." },
    score: { name: "Jordan Reyes", value: 4, notes: "Strong portfolio, deep React and accessibility knowledge." },
    comments: ["Portfolio is excellent — shortlisting for the system design round.", "Notice period is long; check if it can be bought out."],
  },
  {
    first: "Arjun", last: "Mehta", email: "arjun.mehta@example.com", phone: "+91 99873 44519",
    role: "Product Designer", status: "changes_requested", invitedDaysAgo: 14,
    responses: { f_full_name: "Arjun Mehta", f_experience: 4, f_current_ctc: 18, f_notice: "30 days" },
    secondSubmission: { f_full_name: "Arjun Mehta", f_experience: 5, f_current_ctc: 18, f_notice: "30 days", f_why: "Keen to own end-to-end design for HR products." },
    comments: ["Asked for the missing portfolio link — resubmitted with it."],
  },
  {
    first: "Lena", last: "Fischer", email: "lena.fischer@example.com", phone: "+49 151 2233 4455",
    role: "Engineering Manager", status: "approved", invitedDaysAgo: 21,
    responses: { f_full_name: "Lena Fischer", f_experience: 11, f_current_ctc: 55, f_notice: "90 days", f_why: "Excited by the multi-tenant platform challenge." },
    score: { name: "Jordan Reyes", value: 5, notes: "Best manager candidate in this loop. Move to offer." },
  },
  { first: "Daniel", last: "Osei", email: "daniel.osei@example.com", phone: "+44 7700 900123", role: "QA Engineer", status: "invited", invitedDaysAgo: 2 },
  {
    first: "Sofia", last: "Rossi", email: "sofia.rossi@example.com", phone: "+39 320 555 0143",
    role: "Data Analyst", status: "rejected", invitedDaysAgo: 27,
    responses: { f_full_name: "Sofia Rossi", f_experience: 2, f_current_ctc: 9, f_notice: "Immediate" },
    comments: ["Solid SQL, but too junior for this opening. Keeping in the talent pool."],
  },
];

const TINY_PDF =
  "data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDIgMCBSPj4KZW5kb2JqCjIgMCBvYmoKPDwvVHlwZS9QYWdlcy9LaWRzWzMgMCBSXS9Db3VudCAxPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgMjAwIDIwMF0+PgplbmRvYmoKdHJhaWxlcgo8PC9Sb290IDEgMCBSPj4K";

/** Idempotent: runs once, only when there are no candidates yet. */
export function seedDemoCandidates(): void {
  if (typeof window === "undefined") return;
  seedDefaultRejectionReasons(MOCK_TENANT_ID);
  if (getLocalCandidates().length > 0) return;

  const form = getLocalForms().find((f) => f.category === "candidate_onboarding" && f.status === "published") ?? demoForm();
  saveLocalForm(form);

  SPECS.forEach((spec) => {
    const candidate: Candidate = {
      id: uuid(),
      tenantId: MOCK_TENANT_ID,
      firstName: spec.first,
      lastName: spec.last,
      email: spec.email,
      phone: spec.phone,
      createdAt: iso(spec.invitedDaysAgo),
      createdBy: "Jordan Reyes",
    };
    saveLocalCandidate(candidate);

    const pipeline: HiringPipeline = {
      id: uuid(),
      tenantId: MOCK_TENANT_ID,
      candidateId: candidate.id,
      formId: form.id,
      formVersionId: form.versionId,
      roleName: spec.role,
      status: spec.status,
      invitedAt: iso(spec.invitedDaysAgo),
      invitedBy: "Jordan Reyes",
      expiresAt: iso(spec.invitedDaysAgo - 10),
      lastActivityAt: iso(Math.max(0, spec.invitedDaysAgo - 4)),
      events: [
        { id: uuid(), at: iso(spec.invitedDaysAgo), label: "Invitation sent", actor: "Jordan Reyes" },
        ...(spec.responses ? [{ id: uuid(), at: iso(spec.invitedDaysAgo - 3), label: "Application submitted", actor: `${spec.first} ${spec.last}` }] : []),
      ],
      ...(spec.status === "rejected" ? { rejectionReasonLabel: "Not enough relevant experience" } : {}),
    };
    saveLocalPipeline(pipeline);

    appendAuditEntry({
      pipelineId: pipeline.id,
      actorId: "u_demo",
      actorName: "Jordan Reyes",
      actorType: "hr",
      action: "invited",
      details: { roleName: spec.role },
    });

    if (spec.responses) {
      const sub: CandidateSubmission = {
        id: uuid(),
        pipelineId: pipeline.id,
        submissionNumber: 1,
        formVersionId: form.versionId,
        responses: spec.responses,
        submittedAt: iso(spec.invitedDaysAgo - 3),
        isDraft: false,
      };
      saveLocalSubmission(sub);
      appendAuditEntry({
        pipelineId: pipeline.id,
        actorId: candidate.id,
        actorName: `${spec.first} ${spec.last}`,
        actorType: "candidate",
        action: "form_submitted",
        details: {},
      });

      const doc: PipelineDocument = {
        id: uuid(),
        pipelineId: pipeline.id,
        uploadedBy: "candidate",
        fileName: `${spec.first.toLowerCase()}-resume.pdf`,
        fileType: "application/pdf",
        fileSizeBytes: 148 * 1024,
        fileData: TINY_PDF,
        documentType: "resume",
        label: "Resume",
        uploadedAt: iso(spec.invitedDaysAgo - 3),
        isVerified: false,
      };
      saveLocalDocument(doc);
    }

    if (spec.secondSubmission) {
      saveLocalSubmission({
        id: uuid(),
        pipelineId: pipeline.id,
        submissionNumber: 2,
        formVersionId: form.versionId,
        responses: spec.secondSubmission,
        submittedAt: iso(Math.max(0, spec.invitedDaysAgo - 6)),
        isDraft: false,
      });
    }

    if (spec.score) {
      saveLocalScore({
        id: uuid(),
        pipelineId: pipeline.id,
        reviewerId: "u_demo",
        reviewerName: spec.score.name,
        overallScore: spec.score.value,
        notes: spec.score.notes,
        scoredAt: iso(Math.max(0, spec.invitedDaysAgo - 4)),
      });
      assignLocalReviewer({
        id: uuid(),
        pipelineId: pipeline.id,
        reviewerId: "u_demo",
        reviewerName: spec.score.name,
        assignedAt: iso(Math.max(0, spec.invitedDaysAgo - 5)),
        assignedBy: "u_demo",
      });
    }

    (spec.comments ?? []).forEach((content, i) => {
      const comment: PipelineComment = {
        id: uuid(),
        pipelineId: pipeline.id,
        authorId: "u_demo",
        authorName: "Jordan Reyes",
        content,
        createdAt: iso(Math.max(0, spec.invitedDaysAgo - 4 - i)),
        isEdited: false,
      };
      saveLocalComment(comment);
    });
  });
}
