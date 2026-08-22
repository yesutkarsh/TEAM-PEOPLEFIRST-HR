import { cn } from "@/lib/utils";
import { ProgressBar } from "@/lib/components/ui";
import type { FormStep } from "@/lib/types/formSchema";

export interface FormProgressProps {
  steps: FormStep[];
  currentStepIndex: number;
}

export function FormProgress({ steps, currentStepIndex }: FormProgressProps) {
  if (steps.length <= 1) return null;
  const pct = Math.round(((currentStepIndex + 1) / steps.length) * 100);
  return (
    <div className="mb-6">
      <ProgressBar value={pct} />
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center gap-1.5">
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium",
                idx === currentStepIndex
                  ? "text-white"
                  : idx < currentStepIndex
                  ? "bg-[#0A0A0A] text-white"
                  : "bg-[#F2F2F0] text-[#6B6B6B]",
              )}
              style={idx === currentStepIndex ? { background: "var(--tenant-primary)" } : undefined}
            >
              {idx < currentStepIndex ? "✓" : idx + 1}
            </span>
            <span
              className={cn(
                "text-[12px]",
                idx === currentStepIndex ? "font-medium text-[#0A0A0A]" : "text-[#6B6B6B]",
              )}
            >
              {step.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
