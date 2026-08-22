import { Card, Button, ProgressBar } from "@/lib/components/ui";
import { ReviewCycleBadge } from "./ReviewCycleBadge";
import { GOAL_PERIOD_LABELS, type ReviewCycle } from "@/lib/types/performance";
import { formatDate } from "@/lib/utils/format";

const FRAMEWORK_LABEL = { okr: "OKR", kra: "KRA", hybrid: "Hybrid" } as const;

export interface ReviewCycleCardProps {
  cycle: ReviewCycle;
  stats?: { selfSubmitted: number; managerComplete: number; peerPending: number; total: number };
  actions?: React.ReactNode;
  onView?: () => void;
  onDuplicate?: () => void;
  onClose?: () => void;
}

function daysLeft(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export function ReviewCycleCard({ cycle, stats, actions, onView, onDuplicate, onClose }: ReviewCycleCardProps) {
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold text-[#0A0A0A]">{cycle.name}</h3>
          <p className="text-[12px] text-[#6B6B6B] mt-0.5">
            {formatDate(cycle.startDate)} – {formatDate(cycle.endDate)} · {GOAL_PERIOD_LABELS[cycle.period]} ·{" "}
            {FRAMEWORK_LABEL[cycle.framework]}
          </p>
        </div>
        <ReviewCycleBadge status={cycle.status} />
      </div>

      <ProgressBar value={cycle.completionRate} label={`${cycle.employeeCount} employees · ${cycle.completionRate}% complete`} />

      {stats && (
        <dl className="grid grid-cols-3 gap-3 pt-2 border-t border-[#E5E5E3] text-[13px]">
          <div><dt className="text-[11px] uppercase tracking-wide text-[#6B6B6B]">Self-assessments</dt><dd className="tabular-nums">{stats.selfSubmitted} / {stats.total}</dd></div>
          <div><dt className="text-[11px] uppercase tracking-wide text-[#6B6B6B]">Manager reviews</dt><dd className="tabular-nums">{stats.managerComplete} / {stats.total}</dd></div>
          <div><dt className="text-[11px] uppercase tracking-wide text-[#6B6B6B]">Peer pending</dt><dd className="tabular-nums">{stats.peerPending}</dd></div>
        </dl>
      )}

      <p className="text-[12px] text-[#6B6B6B]">
        Self-review by {formatDate(cycle.selfReviewDeadline)} ({daysLeft(cycle.selfReviewDeadline)} days) · Manager review by{" "}
        {formatDate(cycle.managerReviewDeadline)} ({daysLeft(cycle.managerReviewDeadline)} days)
      </p>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E5E5E3]">
        {onView && <Button size="sm" variant="secondary" onClick={onView}>View / edit</Button>}
        {onDuplicate && <Button size="sm" variant="ghost" onClick={onDuplicate}>Duplicate</Button>}
        {onClose && cycle.status !== "completed" && <Button size="sm" variant="ghost" onClick={onClose}>Close cycle</Button>}
        {actions}
      </div>
    </Card>
  );
}
