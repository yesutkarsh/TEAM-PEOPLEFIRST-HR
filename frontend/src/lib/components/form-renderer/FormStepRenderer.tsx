import type { FormStep } from "@/lib/types/formSchema";
import { getVisibleFields } from "@/lib/utils/formConditions";
import { FormFieldRenderer } from "./FormFieldRenderer";

export interface FormStepRendererProps {
  step: FormStep;
  values: Record<string, unknown>;
  errors: Record<string, string>;
  onFieldChange: (fieldId: string, value: unknown) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

export function FormStepRenderer({
  step,
  values,
  errors,
  onFieldChange,
  disabled,
  readOnly,
}: FormStepRendererProps) {
  const visibleFields = getVisibleFields(step, values);
  return (
    <div className="space-y-6">
      {step.description && <p className="text-[14px] text-[#6B6B6B]">{step.description}</p>}
      {visibleFields.map((field) => (
        <FormFieldRenderer
          key={field.id}
          field={field}
          value={values[field.id]}
          onChange={(v) => onFieldChange(field.id, v)}
          error={errors[field.id]}
          disabled={disabled}
          readOnly={readOnly}
          formValues={values}
        />
      ))}
    </div>
  );
}
