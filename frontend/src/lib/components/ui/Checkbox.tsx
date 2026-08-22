import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, error, className, id, ...rest },
  ref,
) {
  const reactId = useId();
  const cid = id ?? reactId;
  return (
    <div>
      <label htmlFor={cid} className="inline-flex items-start gap-2.5 cursor-pointer select-none">
        <input
          ref={ref}
          id={cid}
          type="checkbox"
          className={cn(
            "mt-0.5 h-4 w-4 rounded-sm border border-[#E5E5E3] accent-[#0A0A0A]",
            "focus:ring-2 focus:ring-[#F97316]/30",
            className,
          )}
          {...rest}
        />
        {label && <span className="text-[14px] text-[#0A0A0A] leading-snug">{label}</span>}
      </label>
      {error && <p aria-live="polite" className="mt-1.5 text-[13px] text-[#DC2626]">{error}</p>}
    </div>
  );
});