/** Small ⓘ icon with hover/focus tooltip. */
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export interface InfoTooltipProps {
  content: string;
  className?: string;
}

export function InfoTooltip({ content, className }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className={cn("relative inline-flex items-center", className)}>
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        aria-label="More info"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold text-[#6B6B6B] hover:text-[#0A0A0A] border border-[#D1D5DB]"
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          id={id}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-10 whitespace-nowrap rounded-md bg-[#0A0A0A] text-white text-[11px] px-2 py-1 shadow-lg"
        >
          {content}
        </span>
      )}
    </span>
  );
}