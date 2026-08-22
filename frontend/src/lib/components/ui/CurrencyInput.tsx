/** ₹ input — formats with the Indian number system on blur, raw digits while focused. */
import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency, parseCurrencyInput } from "@/lib/utils/format";

export interface CurrencyInputProps {
  label?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  error?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function CurrencyInput({
  label, value, onChange, placeholder = "0", min, max, error, hint, disabled, className, id,
}: CurrencyInputProps) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState(value === null ? "" : String(value));
  const [localError, setLocalError] = useState<string | undefined>();

  useEffect(() => {
    if (!focused) setRaw(value === null || value === undefined ? "" : String(value));
  }, [value, focused]);

  const shown = focused ? raw : value === null || value === undefined ? "" : formatCurrency(value);
  const shownError = error ?? localError;

  const handleChange = (next: string) => {
    setRaw(next);
    if (next.trim() === "") { setLocalError(undefined); onChange(null); return; }
    const parsed = parseCurrencyInput(next);
    if (parsed === null) { setLocalError("Enter a valid amount."); onChange(null); return; }
    if (min !== undefined && parsed < min) { setLocalError(`Minimum is ${formatCurrency(min)}.`); onChange(null); return; }
    if (max !== undefined && parsed > max) { setLocalError(`Maximum is ${formatCurrency(max)}.`); onChange(null); return; }
    setLocalError(undefined);
    onChange(parsed);
  };

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-[#0A0A0A]">{label}</label>
      )}
      <input
        id={inputId}
        inputMode="decimal"
        disabled={disabled}
        value={shown}
        placeholder={placeholder}
        aria-invalid={!!shownError}
        onFocus={() => { setFocused(true); setRaw(value === null || value === undefined ? "" : String(value)); }}
        onBlur={() => setFocused(false)}
        onChange={(e) => handleChange(e.target.value)}
        className={cn(
          "w-full h-11 rounded-sm border bg-white px-3 text-[15px] tabular-nums text-[#0A0A0A] placeholder:text-[#6B6B6B]",
          "transition-colors duration-150 ease-out outline-none focus:ring-2 focus:ring-[#F97316]/30",
          shownError ? "border-[#DC2626] focus:border-[#DC2626]" : "border-[#E5E5E3] focus:border-[#0A0A0A]",
          "disabled:bg-[#F2F2F0] disabled:cursor-not-allowed",
        )}
      />
      {shownError ? (
        <p aria-live="polite" className="mt-1.5 text-[13px] text-[#DC2626]">{shownError}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-[#6B6B6B]">{hint}</p>
      ) : null}
    </div>
  );
}