/** Shows % complete with hover-revealed missing fields list. */
import { useState } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { ProgressBar } from "@/lib/components/ui/ProgressBar";
import { cn } from "@/lib/utils";

export interface ProfileCompletenessBarProps {
  percentage: number;
  missingFields: string[];
  className?: string;
}

export function ProfileCompletenessBar({ percentage, missingFields, className }: ProfileCompletenessBarProps) {
  const [open, setOpen] = useState(false);
  const isComplete = percentage === 100;

  return (
    <div className={cn("relative rounded-2xl border border-[#E5E5E3] bg-white p-4 sm:p-5 shadow-xs", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="w-full text-left focus:outline-hidden group"
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8E8E8E]">
              Profile Completeness
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[18px] sm:text-[22px] font-bold tracking-tight text-[#0A0A0A] tabular-nums">
              {percentage}%
            </span>
            {missingFields.length > 0 && (
              <Info className="w-4 h-4 text-neutral-400 group-hover:text-orange-500 transition-colors" />
            )}
          </div>
        </div>

        <ProgressBar value={percentage} />

        <div className="mt-2.5 flex items-center justify-between text-[12px] text-neutral-500 font-medium">
          {isComplete ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> All required fields complete
            </span>
          ) : (
            <span>
              {missingFields.length} field{missingFields.length === 1 ? "" : "s"} missing — hover to view
            </span>
          )}
          <span className="text-neutral-400 group-hover:text-orange-600 font-semibold text-[11px] transition-colors">
            {open ? "Hide details" : "Details →"}
          </span>
        </div>
      </button>

      {open && missingFields.length > 0 && (
        <div className="absolute left-0 right-0 z-30 mt-2 rounded-xl border border-[#E5E5E3] bg-white p-4 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#F2F2F0]">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#0A0A0A]">
              Missing Information ({missingFields.length})
            </p>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] text-[#404040]">
            {missingFields.map((f) => (
              <li key={f} className="flex items-center gap-1.5 bg-[#FAFAF9] px-2.5 py-1.5 rounded-lg border border-[#F2F2F0]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="truncate">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}