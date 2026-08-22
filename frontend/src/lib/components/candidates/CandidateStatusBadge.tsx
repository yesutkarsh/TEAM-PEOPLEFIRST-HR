/** Coloured pill for CandidatePipelineStatus. */
import { cn } from "@/lib/utils";
import { CANDIDATE_STATUS_LABELS, type CandidatePipelineStatus } from "@/lib/types/candidate";

const styles: Record<CandidatePipelineStatus, string> = {
  invited: "bg-[#F2F2F0] text-[#6B6B6B]",
  portal_opened: "bg-white text-[#1E3A8A] border border-[#BFDBFE]",
  form_in_progress: "bg-[#DBEAFE] text-[#1E3A8A]",
  submitted: "bg-[#FEF3C7] text-[#92400E]",
  changes_requested: "bg-[#FEF3C7] text-[#92400E]",
  resubmitting: "bg-[#FEF3C7] text-[#92400E]",
  approved: "bg-white text-[#166534] border border-[#BBF7D0]",
  offer_pending: "bg-[#CCFBF1] text-[#115E59]",
  offer_sent: "bg-[#CCFBF1] text-[#115E59]",
  candidate_signed: "bg-[#CCFBF1] text-[#115E59]",
  offer_rejected: "bg-[#FEE2E2] text-[#991B1B]",
  countersigned: "bg-[#CCFBF1] text-[#115E59]",
  onboarding: "bg-[#DCFCE7] text-[#166534]",
  converting: "bg-[#DCFCE7] text-[#166534]",
  converted: "bg-[#DCFCE7] text-[#166534]",
  rejected: "bg-[#FEE2E2] text-[#991B1B]",
  withdrawn: "bg-[#F2F2F0] text-[#6B6B6B]",
  expired: "bg-white text-[#991B1B] border border-[#FECACA]",
};

export interface CandidateStatusBadgeProps {
  status: CandidatePipelineStatus;
  size?: "sm" | "md";
  className?: string;
}

export function CandidateStatusBadge({ status, size = "md", className }: CandidateStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]",
        styles[status],
        className,
      )}
    >
      {CANDIDATE_STATUS_LABELS[status]}
    </span>
  );
}
