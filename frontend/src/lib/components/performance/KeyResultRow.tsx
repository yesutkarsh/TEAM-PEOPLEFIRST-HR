import { useState } from "react";
import { Badge, Button, Input } from "@/lib/components/ui";
import { GoalStatusBadge } from "./GoalStatusBadge";
import type { KeyResult } from "@/lib/types/performance";

export interface KeyResultRowProps {
  kr: KeyResult;
  editable?: boolean;
  onUpdate?: (currentValue: number) => void | Promise<void>;
}

export function KeyResultRow({ kr, editable, onUpdate }: KeyResultRowProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(kr.currentValue));
  const [saving, setSaving] = useState(false);
  const pct = Math.round(kr.progress);

  const save = async () => {
    const num = Number(value);
    if (Number.isNaN(num)) return;
    setSaving(true);
    try { await onUpdate?.(num); setEditing(false); } finally { setSaving(false); }
  };

  return (
    <div className="flex items-center gap-3 py-2.5 border-t border-[#E5E5E3] first:border-t-0">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-[#0A0A0A] truncate">{kr.title}</p>
        <div className="mt-1.5 h-1 rounded-full bg-[#E5E5E3] overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, pct)}%`, background: pct >= 100 ? "#16A34A" : "var(--tenant-primary)" }}
          />
        </div>
      </div>
      {editing ? (
        <div className="flex items-center gap-2">
          <Input value={value} onChange={(e) => setValue(e.target.value)} className="w-24" aria-label="Current value" />
          <Button size="sm" variant="primary" loading={saving} onClick={() => void save()}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      ) : (
        <>
          <span className="text-[12px] tabular-nums text-[#6B6B6B] whitespace-nowrap">
            {kr.currentValue} / {kr.targetValue} {kr.unit}
          </span>
          {/* Over-achievement is celebrated, never treated as an error. */}
          {pct >= 100 ? <Badge variant="success">{pct}%</Badge> : <GoalStatusBadge status={kr.status} />}
          {editable && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Update</Button>
          )}
        </>
      )}
    </div>
  );
}
