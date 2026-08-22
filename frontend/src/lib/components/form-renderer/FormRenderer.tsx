import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Alert } from "@/lib/components/ui";
import type { FormSchema } from "@/lib/types/formSchema";
import { validateStep } from "@/lib/utils/formConditions";
import { FormStepRenderer } from "./FormStepRenderer";
import { FormProgress } from "./FormProgress";
import { FormNavigation } from "./FormNavigation";
import { DraftSaveIndicator } from "./DraftSaveIndicator";

export interface FormRendererProps {
  schema: FormSchema;
  initialValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => Promise<void> | void;
  onDraftSave?: (values: Record<string, unknown>) => void;
  isPreview?: boolean;
  readOnly?: boolean;
  banner?: ReactNode;
}

const AUTOSAVE_DELAY_MS = 1200;

function scrollToFirstError(errors: Record<string, string>) {
  const firstId = Object.keys(errors)[0];
  if (!firstId) return;
  requestAnimationFrame(() => {
    const el = document.querySelector(`[data-field-id="${firstId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

export function FormRenderer({
  schema,
  initialValues,
  onSubmit,
  onDraftSave,
  isPreview,
  readOnly,
  banner,
}: FormRendererProps) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues ?? {});
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved">("idle");

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const steps = schema.steps;
  const currentStep = steps[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;
  const canAutosave = !!schema.settings.allowDraftSaving && !isPreview && !readOnly && !!onDraftSave;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!canAutosave) return;
    setDraftStatus("saving");
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      onDraftSave?.(values);
      setDraftStatus("saved");
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, canAutosave]);

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const validateCurrentStep = (): boolean => {
    const stepErrors = validateStep(currentStep, values);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      scrollToFirstError(stepErrors);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const handleBack = () => {
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;
    setSubmitting(true);
    try {
      await onSubmit(values);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const submitLabel = useMemo(
    () => schema.settings.submitButtonLabel || "Submit",
    [schema.settings.submitButtonLabel],
  );

  if (submitted) {
    return (
      <Alert variant="success" title="Submitted">
        {schema.settings.successMessage || "Thank you! Your response has been recorded."}
      </Alert>
    );
  }

  if (!currentStep) {
    return (
      <Alert variant="warning" title="No fields configured">
        This form has no steps to display yet.
      </Alert>
    );
  }

  return (
    <div>
      {banner}
      {schema.settings.showProgressBar && (
        <FormProgress steps={steps} currentStepIndex={stepIndex} />
      )}
      <FormStepRenderer
        step={currentStep}
        values={values}
        errors={errors}
        onFieldChange={handleFieldChange}
        disabled={submitting || readOnly}
        readOnly={readOnly}
      />
      <div className="mt-3 flex justify-end">
        <DraftSaveIndicator status={draftStatus} />
      </div>
      <FormNavigation
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
        submitting={submitting}
        submitLabel={submitLabel}
        onBack={handleBack}
        onNext={handleNext}
        onSubmit={handleSubmit}
        readOnly={readOnly}
      />
    </div>
  );
}
