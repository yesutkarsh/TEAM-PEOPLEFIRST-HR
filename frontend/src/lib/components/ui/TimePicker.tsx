/** Native time input styled to match the design system. */
import { useId } from "react";
import { cn } from "@/lib/utils";

export interface TimePickerProps {
  label?: string;
  value: string; // HH:mm
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function TimePicker({ label, value, onChange, error, hint, disabled, className, id }: TimePickerProps) {
  const reactId = useId();
  const tid = id ?? reactId;
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label htmlFor={tid} className="mb-1.5 block text-[13px] font-medium text-[#0A0A0A]">
          {label}
        </label>
      )}
      <input
        id={tid}
        type="time"
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className={cn(
          "w-full h-11 px-3 rounded-sm border bg-white text-[15px] text-[#0A0A0A] outline-none transition-colors",
          "focus:ring-2 focus:ring-[var(--tenant-primary)]/25 disabled:bg-[#F2F2F0] disabled:cursor-not-allowed",
          error ? "border-[#DC2626]" : "border-[#E5E5E3] focus:border-[#0A0A0A]",
        )}
      />
      {error ? (
        <p className="mt-1.5 text-[13px] text-[#DC2626]">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-[#6B6B6B]">{hint}</p>
      ) : null}
    </div>
  );
}