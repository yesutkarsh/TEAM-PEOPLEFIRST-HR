/**
 * Pure conditional-logic + validation engine for the Form Engine.
 * BACKEND: duplicated verbatim server-side and used by
 * POST /api/portal/[pipelineId]/submit so conditional required fields
 * cannot be bypassed by a client that ignores the JS conditions.
 */
import type { Condition, FormField, FormSchema, FormStep } from "../types/formSchema";
import { NON_DATA_FIELD_TYPES } from "../types/formSchema";

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as object).length === 0;
  return false;
}

function toComparable(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(String).join(",");
  return String(value);
}

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : NaN;
}

export function evaluateCondition(
  condition: Condition,
  formValues: Record<string, unknown>,
): boolean {
  if (!condition.rules.length) return false;
  const results = condition.rules.map((rule) => {
    const actual = formValues[rule.fieldId];
    switch (rule.operator) {
      case "equals":
        if (Array.isArray(actual)) return actual.map(String).includes(String(rule.value));
        if (typeof actual === "boolean") return actual === (rule.value === true || rule.value === "true");
        return toComparable(actual) === String(rule.value);
      case "not_equals":
        if (Array.isArray(actual)) return !actual.map(String).includes(String(rule.value));
        return toComparable(actual) !== String(rule.value);
      case "contains":
        return toComparable(actual).toLowerCase().includes(String(rule.value).toLowerCase());
      case "not_contains":
        return !toComparable(actual).toLowerCase().includes(String(rule.value).toLowerCase());
      case "greater_than": {
        const a = toNumber(actual);
        const b = toNumber(rule.value);
        return Number.isFinite(a) && Number.isFinite(b) && a > b;
      }
      case "less_than": {
        const a = toNumber(actual);
        const b = toNumber(rule.value);
        return Number.isFinite(a) && Number.isFinite(b) && a < b;
      }
      case "is_empty":
        return isEmpty(actual);
      case "is_not_empty":
        return !isEmpty(actual);
      default:
        return false;
    }
  });
  return condition.logic === "or" ? results.some(Boolean) : results.every(Boolean);
}

export function isFieldVisible(field: FormField, formValues: Record<string, unknown>): boolean {
  const c = field.condition;
  if (!c || !c.rules.length) return true;
  if (c.effect === "show") return evaluateCondition(c, formValues);
  if (c.effect === "hide") return !evaluateCondition(c, formValues);
  return true; // require / make_optional never affect visibility
}

export function isFieldRequired(field: FormField, formValues: Record<string, unknown>): boolean {
  if (NON_DATA_FIELD_TYPES.includes(field.type)) return false;
  const c = field.condition;
  if (!c || !c.rules.length) return field.required;
  if (c.effect === "require") return evaluateCondition(c, formValues) ? true : field.required;
  if (c.effect === "make_optional") return evaluateCondition(c, formValues) ? false : field.required;
  return field.required;
}

export function getVisibleFields(step: FormStep, formValues: Record<string, unknown>): FormField[] {
  return step.fields.filter((f) => isFieldVisible(f, formValues));
}

export function validateField(
  field: FormField,
  value: unknown,
  formValues: Record<string, unknown>,
): string | null {
  if (NON_DATA_FIELD_TYPES.includes(field.type)) return null;

  const required = isFieldRequired(field, formValues);
  if (required && isEmpty(value)) return `${field.label || "This field"} is required.`;
  if (isEmpty(value)) return null;

  if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
    return "Enter a valid email address.";
  }
  if (field.type === "phone" && String(value).replace(/\D/g, "").length < 7) {
    return "Enter a valid phone number.";
  }
  if (field.type === "date") {
    const t = new Date(String(value)).getTime();
    if (Number.isNaN(t)) return "Enter a valid date.";
    if (field.minDate && t < new Date(field.minDate).getTime())
      return `Date must be on or after ${field.minDate.slice(0, 10)}.`;
    if (field.maxDate && t > new Date(field.maxDate).getTime())
      return `Date must be on or before ${field.maxDate.slice(0, 10)}.`;
  }

  for (const rule of field.validation ?? []) {
    const str = toComparable(value);
    const num = toNumber(value);
    switch (rule.type) {
      case "min":
        if (Number.isFinite(num) && num < toNumber(rule.value)) return rule.message;
        break;
      case "max":
        if (Number.isFinite(num) && num > toNumber(rule.value)) return rule.message;
        break;
      case "min_length":
        if (str.length < toNumber(rule.value)) return rule.message;
        break;
      case "max_length":
        if (str.length > toNumber(rule.value)) return rule.message;
        break;
      case "pattern":
      case "custom":
        try {
          if (!new RegExp(String(rule.value)).test(str)) return rule.message;
        } catch {
          /* invalid regex — ignore rather than block submission */
        }
        break;
    }
  }
  return null;
}

export function validateStep(
  step: FormStep,
  formValues: Record<string, unknown>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of getVisibleFields(step, formValues)) {
    if (field.type === "repeatable_group") {
      const rows = Array.isArray(formValues[field.id])
        ? (formValues[field.id] as Array<Record<string, unknown>>)
        : [];
      if (isFieldRequired(field, formValues) && rows.length === 0) {
        errors[field.id] = `${field.label} requires at least one entry.`;
        continue;
      }
      if (field.minRows && rows.length < field.minRows) {
        errors[field.id] = `Add at least ${field.minRows} entries.`;
        continue;
      }
      const rowError = rows.some((row) =>
        (field.fields ?? []).some((sub) => validateField(sub, row?.[sub.id], row ?? {}) !== null),
      );
      if (rowError) errors[field.id] = "Some entries are incomplete.";
      continue;
    }
    const err = validateField(field, formValues[field.id], formValues);
    if (err) errors[field.id] = err;
  }
  return errors;
}

export function validateSchemaValues(
  schema: FormSchema,
  formValues: Record<string, unknown>,
): Record<string, string> {
  return schema.steps.reduce<Record<string, string>>(
    (acc, step) => ({ ...acc, ...validateStep(step, formValues) }),
    {},
  );
}

/**
 * Returns the ids of fields whose conditions form a dependency cycle.
 * Blocks publish when non-empty.
 */
export function detectCircularConditions(schema: FormSchema): string[] {
  const deps = new Map<string, string[]>();
  const collect = (fields: FormField[]) => {
    for (const f of fields) {
      if (f.condition?.rules.length) {
        deps.set(f.id, f.condition.rules.map((r) => r.fieldId));
      }
      if (f.fields?.length) collect(f.fields);
    }
  };
  schema.steps.forEach((s) => collect(s.fields));

  const state = new Map<string, 0 | 1 | 2>();
  const circular = new Set<string>();

  const visit = (id: string, stack: string[]): void => {
    const st = state.get(id);
    if (st === 1) {
      const start = stack.indexOf(id);
      stack.slice(start === -1 ? 0 : start).forEach((n) => circular.add(n));
      return;
    }
    if (st === 2) return;
    state.set(id, 1);
    for (const dep of deps.get(id) ?? []) visit(dep, [...stack, id]);
    state.set(id, 2);
  };

  for (const id of deps.keys()) visit(id, []);
  return [...circular];
}