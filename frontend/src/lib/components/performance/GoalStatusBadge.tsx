import { Badge } from "@/lib/components/ui";
import { GOAL_STATUS_LABELS, type GoalStatus } from "@/lib/types/performance";

const VARIANT: Record<GoalStatus, "default" | "success" | "warning" | "danger" | "accent"> = {
  draft: "default",
  active: "default",
  on_track: "success",
  at_risk: "warning",
  behind: "danger",
  completed: "success",
  cancelled: "default",
};

export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  return <Badge variant={VARIANT[status]}>{GOAL_STATUS_LABELS[status]}</Badge>;
}
