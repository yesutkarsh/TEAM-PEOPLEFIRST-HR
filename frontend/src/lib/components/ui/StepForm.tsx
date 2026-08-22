/** Multi-step form shell. */
import type { ReactNode } from "react";
import { Button } from "./Button";
import { StepIndicator } from "@/lib/components/onboarding/StepIndicator";

export interface StepFormStep {
  id: string;
  label: string;
}

export interface StepFormProps {
  steps: StepFormStep[];
  currentStep: number;
  onBack?: () => void;
  onContinue?: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  continueDisabled?: boolean;
  children: ReactNode;
}

export function StepForm({
  steps,
  currentStep,
  onBack,
  onContinue,
  onSubmit,
  submitLabel = "Submit",
  isSubmitting,
  continueDisabled,
  children,
}: StepFormProps) {
  const isLast = currentStep === steps.length - 1;
  return (
    <div>
      <StepIndicator steps={steps.map((s) => s.label)} currentStep={currentStep} />
      <div className="mt-4">{children}</div>
      <div className="mt-8 flex items-center justify-between border-t border-[#E5E5E3] pt-5">
        <div>
          {currentStep > 0 && (
            <Button variant="secondary" onClick={onBack} disabled={isSubmitting}>← Back</Button>
          )}
        </div>
        <div>
          {isLast ? (
            <Button variant="primary" onClick={onSubmit} loading={isSubmitting} disabled={continueDisabled}>
              {submitLabel}
            </Button>
          ) : (
            <Button variant="primary" onClick={onContinue} disabled={continueDisabled}>
              Continue →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}