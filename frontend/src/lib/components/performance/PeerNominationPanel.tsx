import { useState } from "react";
import { Card, MultiSelect, Button, Badge, showToast } from "@/lib/components/ui";
import type { Employee } from "@/lib/types/employee";
import type { Review } from "@/lib/types/performance";

export interface PeerNominationPanelProps {
  review: Review;
  employees: Employee[];
  minPeers: number;
  onSave: (ids: string[]) => Promise<void> | void;
}

export function PeerNominationPanel({ review, employees, minPeers, onSave }: PeerNominationPanelProps) {
  const [ids, setIds] = useState<string[]>(review.peerNominees);
  const [saving, setSaving] = useState(false);
  // Edge case 8 — a reviewee can never nominate themselves.
  const options = employees
    .filter((e) => e.id !== review.employeeId)
    .map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName}` }));

  const save = async () => {
    if (ids.includes(review.employeeId)) return showToast("You cannot nominate yourself as a peer reviewer.", "error");
    setSaving(true);
    try { await onSave(ids); } finally { setSaving(false); }
  };

  return (
    <Card className="space-y-3">
      <div>
        <h3 className="text-[15px] font-semibold">Peer reviewers</h3>
        <p className="text-[12px] text-[#6B6B6B]">Nominate at least {minPeers} colleagues.</p>
      </div>
      <MultiSelect options={options} value={ids} onChange={setIds} placeholder="Select colleagues…" />
      {ids.length > 0 && ids.length < minPeers && (
        <p className="text-[12px] text-[#B45309]">
          {minPeers - ids.length} more nomination(s) needed. If the minimum isn't met by the deadline, the cycle proceeds
          without them and the shortfall is noted on your record.
        </p>
      )}
      {review.peerReviews.length > 0 && (
        <ul className="space-y-1.5 pt-2 border-t border-[#E5E5E3]">
          {review.peerReviews.map((p) => {
            const e = employees.find((x) => x.id === p.reviewerId);
            return (
              <li key={p.id} className="flex items-center justify-between text-[13px]">
                <span>{e ? `${e.firstName} ${e.lastName}` : p.reviewerId}</span>
                <Badge variant={p.status === "completed" ? "success" : p.status === "declined" ? "danger" : "warning"}>
                  {p.status}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex justify-end">
        <Button size="sm" variant="primary" loading={saving} onClick={() => void save()}>Save nominations</Button>
      </div>
    </Card>
  );
}
