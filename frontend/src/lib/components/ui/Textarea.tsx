import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className, id, ...rest },
  ref,
) {
  const reactId = useId();
  const tid = id ?? reactId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={tid} className="mb-1.5 block text-[13px] font-medium text-[#0A0A0A]">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={tid}
        aria-invalid={!!error}
        className={cn(
          "w-full min-h-[96px] rounded-sm border bg-white p-3 text-[15px] text-[#0A0A0A] placeholder:text-[#6B6B6B]",
          "transition-colors duration-150 ease-out outline-none focus:ring-2 focus:ring-[#F97316]/30",
          error ? "border-[#DC2626]" : "border-[#E5E5E3] focus:border-[#0A0A0A]",
          className,
        )}
        {...rest}
      />
      {error ? (
        <p aria-live="polite" className="mt-1.5 text-[13px] text-[#DC2626]">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-[#6B6B6B]">{hint}</p>
      ) : null}
    </div>
  );
});