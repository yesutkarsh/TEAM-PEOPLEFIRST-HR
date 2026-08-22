/** Labeled text input with error + hint slots. */
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  hint?: string;
  leadingIcon?: ReactNode;
  type?: "text" | "email" | "password" | "url" | "tel" | "number";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leadingIcon, type = "text", className, id, ...rest },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const describedBy = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-[#0A0A0A]">
          {label}
        </label>
      )}
      <div className="relative">
        {leadingIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]">
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(
            "w-full h-11 rounded-sm border bg-white px-3 text-[15px] text-[#0A0A0A] placeholder:text-[#6B6B6B]",
            "transition-colors duration-150 ease-out outline-none",
            "focus:ring-2 focus:ring-[#F97316]/30",
            error
              ? "border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/30"
              : "border-[#E5E5E3] focus:border-[#0A0A0A]",
            leadingIcon && "pl-10",
            "disabled:bg-[#F2F2F0] disabled:cursor-not-allowed",
            className,
          )}
          {...rest}
        />
      </div>
      {error ? (
        <p id={`${inputId}-err`} aria-live="polite" className="mt-1.5 text-[13px] text-[#DC2626]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-[13px] text-[#6B6B6B]">
          {hint}
        </p>
      ) : null}
    </div>
  );
});