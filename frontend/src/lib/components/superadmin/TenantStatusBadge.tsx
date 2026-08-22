import { Badge } from "@/lib/components/ui";
import type { TenantStatus } from "@/lib/types/admin";

const MAP: Record<TenantStatus, { variant: "success" | "warning" | "danger" | "default"; label: string }> = {
  active: { variant: "success", label: "Active" },
  trial: { variant: "warning", label: "Trial" },
  suspended: { variant: "danger", label: "Suspended" },
  churned: { variant: "default", label: "Churned" },
};

export function TenantStatusBadge({ status }: { status: TenantStatus }) {
  const m = MAP[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
