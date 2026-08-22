import { cn } from "@/lib/utils";
import { CYCLE_STATUS_LABELS, type ReviewCycleStatus } from "@/lib/types/performance";

const STYLE: Record<ReviewCycleStatus, string> = {
  draft: "bg-[#F2F2F0] text-[#6B6B6B]",
  active: "bg-[#16A34A]/10 text-[#15803D]",
  review_in_progress: "bg-[#2563EB]/10 text-[#1D4ED8]",
  calibration: "bg-[#F59E0B]/15 text-[#B45309]",
  completed: "bg-[#0D9488]/10 text-[#0F766E]",
};

export function ReviewCycleBadge({ status }: { status: ReviewCycleStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-medium", STYLE[status])}>
      {CYCLE_STATUS_LABELS[status]}
    </span>
  );
}
