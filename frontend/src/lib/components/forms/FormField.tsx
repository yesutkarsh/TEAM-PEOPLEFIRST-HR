import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

/** Wrapper: label + control + (error | hint). Use when not using built-in Input label. */
export function FormField({ label, htmlFor, required, error, hint, children, className }: FormFieldProps) {
  return (
    <div className={cn("w-full", className)}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-[#0A0A0A]">
        {label} {required && <span className="text-[#DC2626]">*</span>}
      </label>
      {children}
      {error ? (
        <p aria-live="polite" className="mt-1.5 text-[13px] text-[#DC2626]">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-[#6B6B6B]">{hint}</p>
      ) : null}
    </div>
  );
}