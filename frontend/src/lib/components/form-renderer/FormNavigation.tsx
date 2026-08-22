import { Button } from "@/lib/components/ui";

export interface FormNavigationProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  submitting?: boolean;
  submitLabel: string;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  readOnly?: boolean;
}

export function FormNavigation({
  isFirstStep,
  isLastStep,
  submitting,
  submitLabel,
  onBack,
  onNext,
  onSubmit,
  readOnly,
}: FormNavigationProps) {
  if (readOnly) return null;
  return (
    <div className="mt-8 flex items-center justify-between border-t border-[#E5E5E3] pt-6">
      <Button type="button" variant="secondary" onClick={onBack} disabled={isFirstStep}>
        Back
      </Button>
      {isLastStep ? (
        <Button type="button" variant="tenant" loading={submitting} onClick={onSubmit}>
          {submitLabel}
        </Button>
      ) : (
        <Button type="button" variant="tenant" onClick={onNext}>
          Next
        </Button>
      )}
    </div>
  );
}
