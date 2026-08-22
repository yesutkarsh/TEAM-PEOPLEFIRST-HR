import { Badge, type BadgeVariant } from "@/lib/components/ui";
import { RUN_STATUS_LABELS, type PayrollRunStatus } from "@/lib/types/payroll";

const map: Record<PayrollRunStatus, BadgeVariant> = {
  draft: "default",
  in_review: "tenant-accent",
  finalised: "success",
  paid: "success",
  cancelled: "danger",
};

export function PayrollRunStatusBadge({ status }: { status: PayrollRunStatus }) {
  return <Badge variant={map[status]}>{RUN_STATUS_LABELS[status]}</Badge>;
}