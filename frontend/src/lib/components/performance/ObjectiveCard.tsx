import { useState } from "react";
import { Card, Button, Badge } from "@/lib/components/ui";
import { GoalProgressRing } from "./GoalProgressRing";
import { GoalStatusBadge } from "./GoalStatusBadge";
import { KeyResultRow } from "./KeyResultRow";
import { GOAL_PERIOD_LABELS, type Objective } from "@/lib/types/performance";

export interface ObjectiveCardProps {
  objective: Objective;
  ownerLabel?: string;
  editable?: boolean;
  defaultExpanded?: boolean;
  depth?: number;
  onUpdateKr?: (krId: string, value: number) => void | Promise<void>;
  onAddChild?: () => void;
  onDelete?: () => void;
  children?: React.ReactNode;
}

export function ObjectiveCard({
  objective: o, ownerLabel, editable, defaultExpanded, depth = 0, onUpdateKr, onAddChild, onDelete, children,
}: ObjectiveCardProps) {
  const [open, setOpen] = useState(defaultExpanded ?? o.level === "company");
  return (
    <div style={{ marginLeft: depth * 20 }}>
      <Card className="space-y-3">
        <div className="flex items-start gap-4">
          <GoalProgressRing value={o.progress} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <h3 className="text-[15px] font-semibold text-[#0A0A0A]">{o.title}</h3>
              <GoalStatusBadge status={o.status} />
            </div>
            <p className="mt-1 text-[12px] text-[#6B6B6B]">
              {GOAL_PERIOD_LABELS[o.period]} {o.year} · {ownerLabel ?? o.ownerId}
              {" · "}
              <Badge variant="default">{o.level}</Badge>
            </p>
            {o.description && <p className="mt-1.5 text-[13px] text-[#6B6B6B]">{o.description}</p>}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-[12px] text-[var(--tenant-primary)] hover:underline"
        >
          {open ? "Hide" : "Show"} {o.keyResults.length} key result{o.keyResults.length === 1 ? "" : "s"}
        </button>

        {open && (
          <div className="border-t border-[#E5E5E3] pt-1">
            {o.keyResults.map((kr) => (
              <KeyResultRow key={kr.id} kr={kr} editable={editable} onUpdate={(v) => onUpdateKr?.(kr.id, v)} />
            ))}
          </div>
        )}

        {(onAddChild || onDelete) && (
          <div className="flex gap-2 pt-2 border-t border-[#E5E5E3]">
            {onAddChild && <Button size="sm" variant="ghost" onClick={onAddChild}>Add child objective</Button>}
            {onDelete && <Button size="sm" variant="ghost" onClick={onDelete}>Delete</Button>}
          </div>
        )}
      </Card>
      {children && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}
