import { Badge, type BadgeVariant } from "@/lib/components/ui";
import type { RegularizationStatus } from "@/lib/types/attendance";

const VARIANT: Record<RegularizationStatus, BadgeVariant> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "default",
};

const LABEL: Record<RegularizationStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export function RegularizationStatusBadge({ status }: { status: RegularizationStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
