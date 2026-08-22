/** Hex text input + native color swatch, kept in sync. */
import { useState, useEffect, useId } from "react";
import { cn } from "@/lib/utils";
import { isValidHex } from "@/lib/themes/utils";

export interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  error?: string;
  className?: string;
}

export function ColorPicker({ label, value, onChange, error, className }: ColorPickerProps) {
  const id = useId();
  const [text, setText] = useState(value);

  useEffect(() => { setText(value); }, [value]);

  const commit = (raw: string) => {
    const v = raw.startsWith("#") ? raw : `#${raw}`;
    if (isValidHex(v)) onChange(v.toUpperCase());
    else setText(value); // revert on blur if invalid
  };

  return (
    <div className={cn("w-full", className)}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-[#0A0A0A]">{label}</label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="text"
          value={text}
          onChange={(e) => {
            const v = e.target.value.toUpperCase();
            setText(v);
            if (isValidHex(v)) onChange(v);
          }}
          onBlur={(e) => commit(e.target.value)}
          aria-invalid={!!error}
          className={cn(
            "flex-1 h-11 rounded-sm border bg-white px-3 font-mono text-[14px] uppercase",
            "outline-none focus:ring-2 focus:ring-[#F97316]/30",
            error ? "border-[#DC2626]" : "border-[#E5E5E3] focus:border-[#0A0A0A]",
          )}
        />
        <input
          type="color"
          aria-label={`${label} swatch`}
          value={isValidHex(text) ? text : value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-9 w-9 rounded-sm border border-[#E5E5E3] cursor-pointer bg-transparent p-0"
        />
      </div>
      {error && <p aria-live="polite" className="mt-1.5 text-[13px] text-[#DC2626]">{error}</p>}
    </div>
  );
}