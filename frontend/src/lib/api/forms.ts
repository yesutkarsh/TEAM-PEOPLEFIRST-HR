/** Form Engine API — localStorage backed (frontend-only mock). */
import type { ApiResponse } from "../types/api";
import type {
  FieldType,
  FormCategory,
  FormField,
  FormSchema,
  FormStep,
} from "../types/formSchema";
import { detectCircularConditions } from "../utils/formConditions";
import {
  deleteLocalForm,
  getLocalForms,
  getLocalFormById,
  getLocalSubmissions,
  saveLocalForm,
  shortId,
  uuid,
} from "../utils/localStorage";
import { delay, fail, ok } from "./client";

const iso = () => new Date().toISOString();

export function makeField(type: FieldType, displayOrder: number): FormField {
  const base: FormField = {
    id: shortId(12),
    type,
    label:
      type === "section_heading"
        ? "Section heading"
        : type === "paragraph"
          ? "Descriptive text shown to the person filling this form."
          : type === "divider"
            ? "Divider"
            : "Untitled question",
    required: false,
    validation: [],
    displayOrder,
  };
  if (["dropdown", "radio", "checkbox_group", "multi_select"].includes(type)) {
    base.options = [
      { id: shortId(8), label: "Option 1", value: "option_1" },
      { id: shortId(8), label: "Option 2", value: "option_2" },
    ];
  }
  if (type === "long_text") base.rows = 4;
  if (type === "file_upload") {
    base.maxFiles = 1;
    base.acceptedFileTypes = [".pdf", ".jpg", ".png"];
    base.maxFileSizeMB = 5;
  }
  if (type === "address") base.addressComponents = ["line1", "line2", "city", "state", "pincode", "country"];
  if (type === "repeatable_group") {
    base.fields = [];
    base.minRows = 0;
    base.maxRows = 10;
  }
  if (type === "signature") base.signatureLabel = "Candidate signature";
  return base;
}

export function makeStep(title = "Step 1"): FormStep {
  return { id: shortId(10), title, fields: [] };
}

export function blankSchema(category: FormCategory = "candidate_onboarding"): FormSchema {
  return {
    id: uuid(),
    version: 1,
    versionId: uuid(),
    title: "Untitled form",
    description: "",
    category,
    status: "draft",
    isMultiStep: false,
    steps: [makeStep("Details")],
    settings: {
      allowDraftSaving: true,
      showProgressBar: true,
      submitButtonLabel: "Submit",
      successMessage: "Thanks! Your response has been recorded.",
    },
    allowedRoleIds: [],
    createdBy: "HR Admin",
    createdAt: iso(),
    updatedAt: iso(),
  };
}

export function countFields(schema: FormSchema): number {
  return schema.steps.reduce((n, s) => n + s.fields.length, 0);
}

export function submissionCount(formId: string): number {
  const form = getLocalFormById(formId);
  if (!form) return 0;
  return getLocalSubmissions().filter((s) => !s.isDraft && s.formVersionId === form.versionId).length;
}

export const formsApi = {
  /** BACKEND: GET /api/forms */
  async list(): Promise<ApiResponse<FormSchema[]>> {
    return delay(ok(getLocalForms()));
  },

  /** BACKEND: GET /api/forms/[id] */
  async get(id: string): Promise<ApiResponse<FormSchema>> {
    const f = getLocalFormById(id);
    return delay(f ? ok(f) : fail<FormSchema>("Form not found.", "not_found"));
  },

  /** BACKEND: POST /api/forms */
  async create(input: Partial<FormSchema> = {}): Promise<ApiResponse<FormSchema>> {
    const form: FormSchema = { ...blankSchema(input.category ?? "candidate_onboarding"), ...input };
    saveLocalForm(form);
    return delay(ok(form));
  },

  /**
   * BACKEND: PATCH /api/forms/[id]. A published version is immutable — editing it
   * forks a new draft version (version + 1) that must be republished.
   */
  async save(form: FormSchema): Promise<ApiResponse<FormSchema>> {
    if (!form.title.trim()) return delay(fail<FormSchema>("Form title is required."));
    const existing = getLocalFormById(form.id);
    let next: FormSchema = { ...form, updatedAt: iso() };
    if (existing?.status === "published" && form.status === "published") {
      next = { ...next, status: "draft", version: existing.version + 1, versionId: uuid() };
    }
    saveLocalForm(next);
    return delay(ok(next));
  },

  /** BACKEND: POST /api/forms/[id]/publish — creates an immutable form_version. */
  async publish(id: string): Promise<ApiResponse<FormSchema>> {
    const form = getLocalFormById(id);
    if (!form) return delay(fail<FormSchema>("Form not found."));
    if (countFields(form) === 0)
      return delay(fail<FormSchema>("Add at least one field before publishing."));
    const circular = detectCircularConditions(form);
    if (circular.length)
      return delay(fail<FormSchema>("Resolve circular conditional logic before publishing."));
    const next: FormSchema = { ...form, status: "published", updatedAt: iso() };
    saveLocalForm(next);
    return delay(ok(next));
  },

  /** BACKEND: PATCH /api/forms/[id] { status: 'archived' } */
  async archive(id: string): Promise<ApiResponse<FormSchema>> {
    const form = getLocalFormById(id);
    if (!form) return delay(fail<FormSchema>("Form not found."));
    const next: FormSchema = { ...form, status: "archived", updatedAt: iso() };
    saveLocalForm(next);
    return delay(ok(next));
  },

  /** BACKEND: POST /api/forms/[id]/duplicate */
  async duplicate(id: string): Promise<ApiResponse<FormSchema>> {
    const form = getLocalFormById(id);
    if (!form) return delay(fail<FormSchema>("Form not found."));
    const copy: FormSchema = {
      ...structuredClone(form),
      id: uuid(),
      versionId: uuid(),
      version: 1,
      status: "draft",
      title: `${form.title} (copy)`,
      createdAt: iso(),
      updatedAt: iso(),
    };
    saveLocalForm(copy);
    return delay(ok(copy));
  },

  /** BACKEND: DELETE /api/forms/[id] — blocked (409) when submissions exist. */
  async remove(id: string): Promise<ApiResponse<{ archived: boolean }>> {
    const count = submissionCount(id);
    if (count > 0) {
      const form = getLocalFormById(id);
      if (form) saveLocalForm({ ...form, status: "archived", updatedAt: iso() });
      return delay(ok({ archived: true }));
    }
    deleteLocalForm(id);
    return delay(ok({ archived: false }));
  },

  /** Published candidate onboarding forms, used by the invite screen. */
  async publishedCandidateForms(): Promise<ApiResponse<FormSchema[]>> {
    return delay(
      ok(getLocalForms().filter((f) => f.status === "published" && f.category === "candidate_onboarding")),
    );
  },
};