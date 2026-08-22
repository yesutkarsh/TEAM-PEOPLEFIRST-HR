/** Horizontal progress bar with optional label. */
import { cn } from "@/lib/utils";

export interface ProgressBarProps {
  value: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[12px] text-[#6B6B6B]">{label}</span>
          <span className="text-[12px] font-medium text-[#0A0A0A]">{pct}%</span>
        </div>
      )}
      <div className="h-2 rounded-full bg-[#F2F2F0] overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full transition-all" style={{ width: pct + "%", background: "var(--tenant-primary)" }} />
      </div>
    </div>
  );
}