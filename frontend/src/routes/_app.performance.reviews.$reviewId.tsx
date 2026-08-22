/** Read-only detail view of a single (typically shared) review. */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/lib/components/layout";
import { Card, EmptyState, Spinner } from "@/lib/components/ui";
import { ReviewStatusBadge, RatingInput } from "@/lib/components/performance";
import { performanceApi } from "@/lib/api/performance";
import type { RatingScale, Review, ReviewCycle } from "@/lib/types/performance";

export const Route = createFileRoute("/_app/performance/reviews/$reviewId")({
  component: ReviewDetailPage,
  pendingComponent: () => <div className="flex justify-center py-20"><Spinner size={28} /></div>,
  head: () => ({
    meta: [
      { title: "Review Detail — Performance — HRMS" },
      { name: "description", content: "View the outcome and ratings for a completed performance review." },
      { property: "og:title", content: "Review Detail — Performance — HRMS" },
      { property: "og:description", content: "View the outcome and ratings for a completed performance review." },
    ],
  }),
});

function ReviewDetailPage() {
  const { reviewId } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<Review | null>(null);
  const [cycle, setCycle] = useState<ReviewCycle | null>(null);
  const [scale, setScale] = useState<RatingScale | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const r = await performanceApi.getReview(reviewId);
      if (!alive) return;
      if (r.data) {
        setReview(r.data);
        const [c, s] = await Promise.all([performanceApi.getCycle(r.data.cycleId), performanceApi.getSettings()]);
        setCycle(c.data ?? null);
        setScale(s.data?.ratingScales.find((x) => x.id === c.data?.ratingScaleId) ?? s.data?.ratingScales[0] ?? null);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [reviewId]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
  if (!review) return <EmptyState title="Review not found" />;

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title={cycle?.name ?? "Review"} description="Review outcome and ratings." />
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-medium">Status</p>
          <ReviewStatusBadge status={review.status} />
        </div>
        {!review.isSharedWithEmployee ? (
          <EmptyState title="Not shared yet" subtitle="Results will appear here once HR shares them with you." />
        ) : (
          <div className="space-y-4 pt-2 border-t border-[#E5E5E3]">
            {scale && (
              <>
                <RatingInput scale={scale} value={review.selfAssessment?.overallRating} label="Self rating" disabled />
                <RatingInput scale={scale} value={review.managerReview?.overallRating} label="Manager rating" disabled />
                <RatingInput scale={scale} value={review.calibratedRating} label="Calibrated rating" disabled />
              </>
            )}
            {review.managerReview?.overallComment && (
              <div>
                <p className="text-[12px] font-medium text-[#0A0A0A]">Manager comments</p>
                <p className="text-[13px] text-[#6B6B6B] mt-1">{review.managerReview.overallComment}</p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
