/** Assign internal reviewers to a hiring pipeline. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar, Button, Card, Select, showToast } from "@/lib/components/ui";
import { PermissionGuard } from "@/lib/components/rbac";
import { reviewApi } from "@/lib/api/candidates";
import { listEmployees } from "@/lib/api/employees";
import type { ReviewerAssignment } from "@/lib/types/candidate";
import type { Employee } from "@/lib/types/employee";

export interface ReviewerAssignmentPanelProps {
  pipelineId: string;
  onChanged?: () => void;
}

export function ReviewerAssignmentPanel({ pipelineId, onChanged }: ReviewerAssignmentPanelProps) {
  const [reviewers, setReviewers] = useState<ReviewerAssignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => setReviewers(reviewApi.reviewers(pipelineId)), [pipelineId]);

  useEffect(() => {
    load();
    void listEmployees({}).then((r) => setEmployees(r.data ?? []));
  }, [load]);

  const options = useMemo(() => {
    const taken = new Set(reviewers.map((r) => r.reviewerId));
    return employees
      .filter((e) => !taken.has(e.id))
      .map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName}` }));
  }, [employees, reviewers]);

  const assign = async () => {
    const emp = employees.find((e) => e.id === pick);
    if (!emp) return;
    setBusy(true);
    const r = await reviewApi.assignReviewer(pipelineId, { id: emp.id, name: `${emp.firstName} ${emp.lastName}` });
    setBusy(false);
    if (r.error) { showToast(r.error.message, "error"); return; }
    showToast("Reviewer assigned.", "success");
    setPick("");
    load();
    onChanged?.();
  };

  const remove = async (a: ReviewerAssignment) => {
    await reviewApi.removeReviewer(a);
    showToast("Reviewer removed.", "success");
    load();
    onChanged?.();
  };

  return (
    <Card>
      <h3 className="text-[13px] font-semibold text-[#0A0A0A] mb-3">Reviewers</h3>
      {reviewers.length === 0 ? (
        <p className="text-[13px] text-[#6B6B6B]">No reviewers assigned yet.</p>
      ) : (
        <ul className="space-y-2">
          {reviewers.map((r) => (
            <li key={r.id} className="flex items-center gap-2">
              <Avatar name={r.reviewerName} size={28} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-[#0A0A0A] truncate">{r.reviewerName}</p>
                <p className="text-[11px] text-[#9CA3AF]">Assigned {new Date(r.assignedAt).toLocaleDateString()}</p>
              </div>
              <PermissionGuard permission="employees.edit">
                <button type="button" className="text-[12px] text-[#DC2626] hover:underline" onClick={() => void remove(r)}>
                  Remove
                </button>
              </PermissionGuard>
            </li>
          ))}
        </ul>
      )}

      <PermissionGuard permission="employees.edit">
        <div className="mt-4 pt-4 border-t border-[#E5E5E3] flex items-end gap-2">
          <Select
            label="Add reviewer"
            className="flex-1"
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            options={[{ value: "", label: options.length ? "Select an employee" : "Everyone is already assigned" }, ...options]}
          />
          <Button size="sm" onClick={assign} disabled={!pick} loading={busy}>Assign</Button>
        </div>
      </PermissionGuard>
    </Card>
  );
}
