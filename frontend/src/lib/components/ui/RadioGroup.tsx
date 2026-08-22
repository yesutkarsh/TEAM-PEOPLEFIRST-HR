/** Accessible radio group with arrow-key navigation. */
import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

export interface RadioGroupProps {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  orientation?: "horizontal" | "vertical";
  className?: string;
  name?: string;
}

export function RadioGroup({ options, value, onChange, orientation = "vertical", className, name }: RadioGroupProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const horiz = orientation === "horizontal";
    const fwd = horiz ? "ArrowRight" : "ArrowDown";
    const back = horiz ? "ArrowLeft" : "ArrowUp";
    if (e.key !== fwd && e.key !== back) return;
    e.preventDefault();
    const next = e.key === fwd ? (idx + 1) % options.length : (idx - 1 + options.length) % options.length;
    const opt = options[next];
    onChange(opt.value);
    refs.current[opt.value]?.focus();
  };

  return (
    <div role="radiogroup" className={cn(orientation === "horizontal" ? "flex gap-2" : "space-y-2", className)}>
      {options.map((opt, i) => {
        const checked = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            name={name}
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => onKey(e, i)}
            ref={(el) => { refs.current[opt.value] = el; }}
            className={cn(
              "text-left px-3 py-2 rounded-md border text-[13px] transition-colors outline-none",
              "focus-visible:ring-2 focus-visible:ring-[var(--tenant-primary)]",
              checked ? "border-[var(--tenant-primary)] bg-[color-mix(in_srgb,var(--tenant-primary)_8%,transparent)]" : "border-[#E5E5E3] hover:bg-[#F2F2F0]",
            )}
          >
            <span className="font-medium">{opt.label}</span>
            {opt.description && <span className="block text-[12px] text-[#6B6B6B] mt-0.5">{opt.description}</span>}
          </button>
        );
      })}
    </div>
  );
}