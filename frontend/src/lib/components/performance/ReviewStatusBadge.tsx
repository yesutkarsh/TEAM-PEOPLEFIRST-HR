import { Badge } from "@/lib/components/ui";
import { REVIEW_STATUS_LABELS, type ReviewStatus } from "@/lib/types/performance";

const VARIANT: Record<ReviewStatus, "default" | "success" | "warning" | "danger" | "accent"> = {
  not_started: "default",
  self_pending: "warning",
  self_complete: "accent",
  manager_pending: "warning",
  manager_complete: "success",
  peer_pending: "warning",
  completed: "success",
};

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return <Badge variant={VARIANT[status]}>{REVIEW_STATUS_LABELS[status]}</Badge>;
}
