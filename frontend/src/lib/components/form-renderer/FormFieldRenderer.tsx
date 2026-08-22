import { cn } from "@/lib/utils";
import type { FormField } from "@/lib/types/formSchema";
import { isFieldRequired } from "@/lib/utils/formConditions";
import { ShortTextField } from "./fields/ShortTextField";
import { LongTextField } from "./fields/LongTextField";
import { EmailField } from "./fields/EmailField";
import { PhoneField } from "./fields/PhoneField";
import { NumberField } from "./fields/NumberField";
import { DateField } from "./fields/DateField";
import { TimeField } from "./fields/TimeField";
import { CheckboxGroupField } from "./fields/CheckboxGroupField";
import { RadioField } from "./fields/RadioField";
import { DropdownField } from "./fields/DropdownField";
import { MultiSelectField } from "./fields/MultiSelectField";
import { FileUploadField, type StoredFile } from "./fields/FileUploadField";
import { SignatureField } from "./fields/SignatureField";
import { AddressField } from "./fields/AddressField";
import { YesNoField } from "./fields/YesNoField";
import { SectionHeadingField } from "./fields/SectionHeadingField";
import { ParagraphField } from "./fields/ParagraphField";
import { DividerField } from "./fields/DividerField";
import { RepeatableGroupField } from "./fields/RepeatableGroupField";
import type { FieldComponentProps } from "./fields/types";

const NON_DATA_TYPES = new Set(["section_heading", "paragraph", "divider"]);
const LAYOUT_TYPES = new Set(["section_heading", "paragraph", "divider"]);

function formatReadOnlyValue(field: FormField, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field.type === "yes_no") return value === true ? "Yes" : value === false ? "No" : "—";
  if (field.type === "checkbox_group" || field.type === "multi_select") {
    const values = Array.isArray(value) ? (value as string[]) : [];
    const labels = values.map((v) => field.options?.find((o) => o.value === v)?.label ?? v);
    return labels.length ? labels.join(", ") : "—";
  }
  if (field.type === "radio" || field.type === "dropdown") {
    return field.options?.find((o) => o.value === value)?.label ?? String(value);
  }
  if (field.type === "file_upload") {
    const files = Array.isArray(value) ? (value as StoredFile[]) : [];
    return files.length ? files.map((f) => f.name).join(", ") : "—";
  }
  if (field.type === "address") {
    const addr = value as Record<string, string>;
    return Object.values(addr ?? {}).filter(Boolean).join(", ") || "—";
  }
  if (field.type === "signature") return value ? "Signed" : "—";
  return String(value);
}

export interface FormFieldRendererProps {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  formValues: Record<string, unknown>;
}

export function FormFieldRenderer({
  field,
  value,
  onChange,
  error,
  disabled,
  readOnly,
  formValues,
}: FormFieldRendererProps) {
  const required = isFieldRequired(field, formValues);
  const componentProps: FieldComponentProps = { field, value, onChange, error, disabled };

  if (LAYOUT_TYPES.has(field.type)) {
    return (
      <div data-field-id={field.id}>
        {field.type === "section_heading" && <SectionHeadingField {...componentProps} />}
        {field.type === "paragraph" && <ParagraphField {...componentProps} />}
        {field.type === "divider" && <DividerField {...componentProps} />}
      </div>
    );
  }

  if (readOnly) {
    return (
      <div data-field-id={field.id} className="py-1">
        <p className="text-[13px] font-medium text-[#6B6B6B]">{field.label}</p>
        <p className="mt-0.5 text-[14px] text-[#0A0A0A] whitespace-pre-wrap">
          {formatReadOnlyValue(field, value)}
        </p>
      </div>
    );
  }

  return (
    <div data-field-id={field.id}>
      <label className="mb-1.5 block text-[13px] font-medium text-[#0A0A0A]">
        {field.label}
        {required && <span className="text-[#DC2626] ml-0.5">*</span>}
      </label>
      {field.type === "short_text" && <ShortTextField {...componentProps} />}
      {field.type === "long_text" && <LongTextField {...componentProps} />}
      {field.type === "email" && <EmailField {...componentProps} />}
      {field.type === "phone" && <PhoneField {...componentProps} />}
      {field.type === "number" && <NumberField {...componentProps} />}
      {field.type === "date" && <DateField {...componentProps} />}
      {field.type === "time" && <TimeField {...componentProps} />}
      {field.type === "checkbox_group" && <CheckboxGroupField {...componentProps} />}
      {field.type === "radio" && <RadioField {...componentProps} />}
      {field.type === "dropdown" && <DropdownField {...componentProps} />}
      {field.type === "multi_select" && <MultiSelectField {...componentProps} />}
      {field.type === "file_upload" && <FileUploadField {...componentProps} />}
      {field.type === "signature" && <SignatureField {...componentProps} />}
      {field.type === "address" && <AddressField {...componentProps} />}
      {field.type === "yes_no" && <YesNoField {...componentProps} />}
      {field.type === "repeatable_group" && <RepeatableGroupField {...componentProps} />}
      {field.helpText && !NON_DATA_TYPES.has(field.type) && (
        <p className="mt-1.5 text-[13px] text-[#6B6B6B]">{field.helpText}</p>
      )}
      {error && (
        <p aria-live="polite" className={cn("mt-1.5 text-[13px] text-[#DC2626]")}>
          {error}
        </p>
      )}
    </div>
  );
}
