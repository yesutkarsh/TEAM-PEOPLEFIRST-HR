import { Link } from "@tanstack/react-router";
import { Card, InfoTooltip } from "@/lib/components/ui";
import { ReviewStatusBadge } from "./ReviewStatusBadge";
import type { Review, ReviewCycle } from "@/lib/types/performance";

export interface ReviewSummaryCardProps {
  review: Review;
  cycle?: ReviewCycle;
}

export function ReviewSummaryCard({ review, cycle }: ReviewSummaryCardProps) {
  const self = review.selfAssessment?.overallRating;
  const mgr = review.managerReview?.overallRating;
  const cal = review.calibratedRating;
  return (
    <Card className="flex items-center justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-[#0A0A0A]">{cycle?.name ?? "Review cycle"}</p>
        <p className="text-[12px] text-[#6B6B6B] mt-0.5">
          {review.isSharedWithEmployee
            ? <>Self: {self ?? "—"} · Manager: {mgr ?? "—"} · Calibrated: {cal ?? "—"}</>
            : "Results not shared yet"}
          {review.isSharedWithEmployee && cal !== undefined && mgr !== undefined && cal !== mgr && (
            <InfoTooltip content="This rating was adjusted during the calibration process." />
          )}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <ReviewStatusBadge status={review.status} />
        <Link
          to="/performance/reviews/$reviewId"
          params={{ reviewId: review.id }}
          className="text-[13px] font-medium hover:underline"
          style={{ color: "var(--tenant-primary)" }}
        >
          View →
        </Link>
      </div>
    </Card>
  );
}
