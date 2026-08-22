/**
 * Form Engine schema types (Phase A).
 * BACKEND: this entire file describes the JSONB `schema` column of `form_versions`.
 * The backend imports these types and validates incoming schemas with Zod before
 * persisting, so no invalid schema ever reaches the database.
 */

export type FieldType =
  | "short_text"
  | "long_text"
  | "email"
  | "phone"
  | "number"
  | "date"
  | "time"
  | "checkbox_group"
  | "radio"
  | "dropdown"
  | "multi_select"
  | "file_upload"
  | "signature"
  | "address"
  | "section_heading"
  | "paragraph"
  | "divider"
  | "repeatable_group"
  | "yes_no";

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "greater_than"
  | "less_than"
  | "is_empty"
  | "is_not_empty";

export interface ConditionRule {
  fieldId: string;
  operator: ConditionOperator;
  value: string | number | boolean;
}

export type ConditionEffect = "show" | "hide" | "require" | "make_optional";

export interface Condition {
  effect: ConditionEffect;
  logic: "and" | "or";
  rules: ConditionRule[];
}

export interface ValidationRule {
  type: "min" | "max" | "min_length" | "max_length" | "pattern" | "custom";
  value: string | number;
  message: string;
}

export interface FieldOption {
  id: string;
  label: string;
  value: string;
}

export type AddressComponent = "line1" | "line2" | "city" | "state" | "pincode" | "country";

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  helpText?: string;
  placeholder?: string;
  defaultValue?: string | string[] | boolean | null;
  required: boolean;
  validation: ValidationRule[];
  condition?: Condition;
  displayOrder: number;

  options?: FieldOption[];
  rows?: number;

  maxFiles?: number;
  acceptedFileTypes?: string[];
  maxFileSizeMB?: number;

  addressComponents?: AddressComponent[];

  minDate?: string;
  maxDate?: string;

  /** repeatable_group only */
  fields?: FormField[];
  minRows?: number;
  maxRows?: number;

  signatureLabel?: string;
}

export interface FormStep {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

export type FormCategory = "candidate_onboarding" | "employee_onboarding" | "custom";
export type FormStatus = "draft" | "published" | "archived";

export interface FormSettings {
  allowDraftSaving: boolean;
  showProgressBar: boolean;
  submitButtonLabel: string;
  successMessage: string;
  redirectAfterSubmit?: string;
}

export interface FormSchema {
  id: string;
  /** BACKEND: version 1 is the draft; each publish creates an immutable form_version row. */
  version: number;
  versionId: string;
  title: string;
  description?: string;
  category: FormCategory;
  status: FormStatus;
  isMultiStep: boolean;
  steps: FormStep[];
  settings: FormSettings;
  /** BACKEND: maps to allowed_role_ids on the forms table. */
  allowedRoleIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  short_text: "Short text",
  long_text: "Long text",
  email: "Email",
  phone: "Phone",
  number: "Number",
  date: "Date",
  time: "Time",
  checkbox_group: "Checkbox group",
  radio: "Radio",
  dropdown: "Dropdown",
  multi_select: "Multi select",
  file_upload: "File upload",
  signature: "Signature",
  address: "Address",
  section_heading: "Section heading",
  paragraph: "Paragraph",
  divider: "Divider",
  repeatable_group: "Repeatable group",
  yes_no: "Yes / No",
};

export const FIELD_TYPE_GLYPHS: Record<FieldType, string> = {
  short_text: "T",
  long_text: "¶",
  email: "@",
  phone: "☎",
  number: "#",
  date: "▤",
  time: "◷",
  checkbox_group: "☑",
  radio: "◉",
  dropdown: "▾",
  multi_select: "≣",
  file_upload: "⇪",
  signature: "✎",
  address: "⌂",
  section_heading: "H",
  paragraph: "≡",
  divider: "—",
  repeatable_group: "⧉",
  yes_no: "⊙",
};

/** Fields that never hold a value. */
export const NON_DATA_FIELD_TYPES: FieldType[] = ["section_heading", "paragraph", "divider"];

export const FIELD_TYPE_GROUPS: Array<{ label: string; types: FieldType[] }> = [
  { label: "Basic", types: ["short_text", "long_text", "email", "phone", "number", "date", "time"] },
  { label: "Choice", types: ["dropdown", "radio", "checkbox_group", "multi_select", "yes_no"] },
  { label: "Advanced", types: ["file_upload", "signature", "address", "repeatable_group"] },
  { label: "Layout", types: ["section_heading", "paragraph", "divider"] },
];

export const FORM_CATEGORY_LABELS: Record<FormCategory, string> = {
  candidate_onboarding: "Candidate onboarding",
  employee_onboarding: "Employee onboarding",
  custom: "Custom",
};