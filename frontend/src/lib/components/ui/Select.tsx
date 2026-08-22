import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, options, placeholder, className, id, ...rest },
  ref,
) {
  const reactId = useId();
  const sid = id ?? reactId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={sid} className="mb-1.5 block text-[13px] font-medium text-[#0A0A0A]">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={sid}
        aria-invalid={!!error}
        className={cn(
          "w-full h-11 rounded-sm border bg-white px-3 text-[15px] text-[#0A0A0A]",
          "transition-colors duration-150 ease-out outline-none focus:ring-2 focus:ring-[#F97316]/30",
          error ? "border-[#DC2626]" : "border-[#E5E5E3] focus:border-[#0A0A0A]",
          className,
        )}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error ? (
        <p aria-live="polite" className="mt-1.5 text-[13px] text-[#DC2626]">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-[#6B6B6B]">{hint}</p>
      ) : null}
    </div>
  );
});