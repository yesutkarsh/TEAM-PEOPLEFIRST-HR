import { Link } from "@tanstack/react-router";
import { EmployeeAvatar } from "@/lib/components/employees";
import { ReviewStatusBadge } from "./ReviewStatusBadge";
import { Badge } from "@/lib/components/ui";
import type { Employee } from "@/lib/types/employee";
import type { Review } from "@/lib/types/performance";

export interface TeamReviewRowData {
  employee: Employee;
  review: Review;
  goalCount: number;
  avgProgress: number;
}

export function TeamReviewEmployeeCell({ employee }: { employee: Employee }) {
  return (
    <span className="flex items-center gap-2.5">
      <EmployeeAvatar employee={employee} size="sm" />
      <span className="min-w-0">
        <span className="block text-[13px] font-medium truncate">{employee.firstName} {employee.lastName}</span>
        <span className="block text-[11px] text-[#6B6B6B]">{employee.employeeCode}</span>
      </span>
    </span>
  );
}

export function TeamReviewGoalsCell({ goalCount, avgProgress }: { goalCount: number; avgProgress: number }) {
  return (
    <span className="block w-32">
      <span className="text-[12px] text-[#6B6B6B]">{goalCount} goals — {Math.round(avgProgress)}% avg</span>
      <span className="mt-1 block h-1 rounded-full bg-[#E5E5E3] overflow-hidden">
        <span className="block h-full rounded-full" style={{ width: `${Math.min(100, avgProgress)}%`, background: "var(--tenant-primary)" }} />
      </span>
    </span>
  );
}

export function TeamReviewStatusCell({ review }: { review: Review }) {
  return <ReviewStatusBadge status={review.status} />;
}

export function TeamReviewSelfCell({ review }: { review: Review }) {
  if (review.selfMissed) return <Badge variant="danger">Missed</Badge>;
  if (review.selfAssessment && !review.selfAssessment.isDraft) return <Badge variant="success">Submitted</Badge>;
  return <Badge variant="warning">Pending</Badge>;
}

export function TeamReviewActionCell({ row }: { row: TeamReviewRowData }) {
  const done = row.review.status === "manager_complete" || row.review.status === "completed";
  return (
    <Link
      to="/performance/team/$employeeId"
      params={{ employeeId: row.employee.id }}
      className="text-[13px] font-medium hover:underline"
      style={{ color: "var(--tenant-primary)" }}
    >
      {done ? "View →" : "Write review →"}
    </Link>
  );
}
