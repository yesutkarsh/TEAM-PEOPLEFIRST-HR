import { cn } from "@/lib/utils";

export interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  const idx = (currentStep + 1).toString().padStart(2, "0");
  return (
    <div className={cn("flex flex-col items-start gap-3", className)}>
      <div className="flex items-center gap-2" role="list" aria-label="Onboarding progress">
        {steps.map((s, i) => {
          const state = i < currentStep ? "done" : i === currentStep ? "current" : "upcoming";
          return (
            <span
              key={s}
              role="listitem"
              aria-current={state === "current" ? "step" : undefined}
              className={cn(
                "h-2.5 w-2.5 rounded-full transition-colors duration-150 motion-reduce:transition-none",
                state === "done" && "bg-[#F97316]",
                state === "current" && "bg-[#0A0A0A]",
                state === "upcoming" && "bg-transparent ring-1 ring-[#E5E5E3]",
              )}
            />
          );
        })}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
        <span className="text-[#0A0A0A]">{idx}</span> / {steps[currentStep]}
      </p>
    </div>
  );
}