/** Phone input with country code select. */
import { cn } from "@/lib/utils";

const CODES = ["+91", "+1", "+44", "+61", "+65", "+971"];

export interface PhoneInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  id?: string;
  className?: string;
}

export function PhoneInput({ label, value, onChange, error, required, id, className }: PhoneInputProps) {
  const match = /^(\+\d{1,3})\s*(.*)$/.exec(value ?? "");
  const code = match?.[1] ?? "+91";
  const rest = match?.[2] ?? (value ?? "").replace(/^\+\d+\s*/, "");
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-[#0A0A0A]">
          {label} {required && <span className="text-[#DC2626]">*</span>}
        </label>
      )}
      <div className="flex">
        <select
          aria-label="Country code"
          value={code}
          onChange={(e) => onChange(`${e.target.value} ${rest}`.trim())}
          className="h-11 rounded-l-md border border-r-0 border-[#E5E5E3] bg-white px-2 text-[14px] focus:outline-none"
        >
          {CODES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          value={rest}
          onChange={(e) => onChange(`${code} ${e.target.value}`.trim())}
          className={cn(
            "flex-1 h-11 px-3 rounded-r-md border bg-white text-[14px] text-[#0A0A0A] focus:outline-none focus:ring-2",
            error
              ? "border-[#DC2626] focus:ring-[#DC2626]/20"
              : "border-[#E5E5E3] focus:border-[var(--tenant-primary)] focus:ring-[var(--tenant-primary)]/20",
          )}
        />
      </div>
      {error && <p className="mt-1.5 text-[13px] text-[#DC2626]">{error}</p>}
    </div>
  );
}