/** Performance Improvement Plan summary card with goal checklist and check-ins. */
import { useState } from "react";
import type { ReactNode } from "react";
import { Card, Badge, Button, Textarea } from "@/lib/components/ui";
import { formatDate } from "@/lib/utils/format";
import type { PIP, PIPGoal } from "@/lib/types/performance";

const STATUS_VARIANT: Record<PIP["status"], "default" | "success" | "warning" | "danger"> = {
  active: "warning", completed: "success", extended: "warning", terminated: "danger",
};

const GOAL_VARIANT: Record<PIPGoal["status"], "default" | "success" | "warning" | "danger"> = {
  pending: "default", in_progress: "warning", met: "success", not_met: "danger",
};

export interface PIPCardProps {
  pip: PIP;
  editable?: boolean;
  onSetGoalStatus?: (goalId: string, status: PIPGoal["status"]) => void | Promise<void>;
  onAddCheckIn?: (notes: string) => void | Promise<void>;
  children?: ReactNode;
}

export function PIPCard({ pip, editable, onSetGoalStatus, onAddCheckIn, children }: PIPCardProps) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submitCheckIn = async () => {
    if (!note.trim() || !onAddCheckIn) return;
    setSaving(true);
    try { await onAddCheckIn(note.trim()); setNote(""); } finally { setSaving(false); }
  };

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-[#0A0A0A]">Performance Improvement Plan</h3>
          <p className="text-[12px] text-[#6B6B6B] mt-0.5">{formatDate(pip.startDate)} – {formatDate(pip.endDate)}</p>
        </div>
        <Badge variant={STATUS_VARIANT[pip.status]}>{pip.status.replace("_", " ")}</Badge>
      </div>
      <p className="text-[13px] text-[#0A0A0A]">{pip.reason}</p>

      <div className="space-y-2 pt-2 border-t border-[#E5E5E3]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Goals</p>
        {pip.goals.map((g) => (
          <div key={g.id} className="flex items-center gap-3 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-[#0A0A0A] truncate">{g.description}</p>
              <p className="text-[11px] text-[#6B6B6B]">{g.metric} · due {formatDate(g.dueDate)}</p>
            </div>
            {editable ? (
              <select
                value={g.status}
                onChange={(e) => onSetGoalStatus?.(g.id, e.target.value as PIPGoal["status"])}
                className="h-8 rounded-sm border border-[#E5E5E3] px-2 text-[12px]"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In progress</option>
                <option value="met">Met</option>
                <option value="not_met">Not met</option>
              </select>
            ) : (
              <Badge variant={GOAL_VARIANT[g.status]}>{g.status.replace("_", " ")}</Badge>
            )}
          </div>
        ))}
      </div>

      {pip.checkIns.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[#E5E5E3]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Check-ins</p>
          {pip.checkIns.map((c) => (
            <div key={c.id} className="text-[13px]">
              <span className="text-[11px] text-[#6B6B6B]">{formatDate(c.date)}</span>
              <p className="text-[#0A0A0A]">{c.notes}</p>
            </div>
          ))}
        </div>
      )}

      {editable && onAddCheckIn && (
        <div className="pt-2 border-t border-[#E5E5E3] space-y-2">
          <Textarea rows={2} placeholder="Add a check-in note…" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" loading={saving} onClick={() => void submitCheckIn()}>Add check-in</Button>
          </div>
        </div>
      )}
      {children}
    </Card>
  );
}
