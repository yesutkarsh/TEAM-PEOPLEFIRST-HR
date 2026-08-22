/** Lightweight multi-select checklist popover. */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface MultiSelectProps {
  label?: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({ label, options, value, onChange, placeholder = "Select…", className }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const summary =
    value.length === 0
      ? placeholder
      : value.length <= 2
      ? options.filter((o) => value.includes(o.value)).map((o) => o.label).join(", ")
      : `${value.length} selected`;
  return (
    <div ref={ref} className={cn("relative w-full", className)}>
      {label && <label className="mb-1.5 block text-[13px] font-medium text-[#0A0A0A]">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full h-10 px-3 text-left rounded-md border border-[#E5E5E3] bg-white text-[14px] flex items-center justify-between",
          value.length === 0 && "text-[#9CA3AF]",
        )}
      >
        <span className="truncate">{summary}</span>
        <span aria-hidden className="text-[#9CA3AF] ml-2">▾</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-[#E5E5E3] rounded-md shadow-md max-h-60 overflow-y-auto">
          {options.map((o) => {
            const checked = value.includes(o.value);
            return (
              <label key={o.value} className="flex items-center gap-2 px-3 py-2 text-[14px] hover:bg-[#FAFAF8] cursor-pointer">
                <input type="checkbox" checked={checked} onChange={() => toggle(o.value)} />
                {o.label}
              </label>
            );
          })}
          {options.length === 0 && <p className="px-3 py-2 text-[13px] text-[#6B6B6B]">No options.</p>}
        </div>
      )}
    </div>
  );
}