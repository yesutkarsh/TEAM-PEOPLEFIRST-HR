/** Accessible date input — native input with min/max. */
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
  maxDate?: string;
  error?: string;
  required?: boolean;
  className?: string;
  id?: string;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  { label, value, onChange, minDate, maxDate, error, required, className, id },
  ref,
) {
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-[#0A0A0A]">
          {label} {required && <span className="text-[#DC2626]">*</span>}
        </label>
      )}
      <input
        id={id}
        ref={ref}
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        min={minDate}
        max={maxDate}
        className={cn(
          "w-full h-11 px-3 rounded-md border bg-white text-[14px] text-[#0A0A0A] focus:outline-none focus:ring-2",
          error
            ? "border-[#DC2626] focus:ring-[#DC2626]/20"
            : "border-[#E5E5E3] focus:border-[var(--tenant-primary)] focus:ring-[var(--tenant-primary)]/20",
        )}
      />
      {error && <p className="mt-1.5 text-[13px] text-[#DC2626]">{error}</p>}
    </div>
  );
});