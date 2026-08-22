/** Append-only audit trail for a hiring pipeline. */
import { useMemo, useState } from "react";
import { Card, EmptyState, Select } from "@/lib/components/ui";
import { reviewApi } from "@/lib/api/candidates";
import type { PipelineAuditEntry } from "@/lib/types/candidate";

export interface PipelineActivityLogProps {
  pipelineId: string;
  /** Bump to re-read after a mutation. */
  refreshKey?: number;
}

const ACTION_LABELS: Record<string, string> = {
  invited: "Invitation sent",
  invitation_resent: "Invitation resent",
  link_opened: "Magic link opened",
  form_submitted: "Application submitted",
  form_started: "Form started",
  draft_saved: "Draft saved",
  changes_requested: "Changes requested",
  link_expired: "Magic link expired",
  withdrawn: "Pipeline withdrawn",
  status_changed: "Status changed",
  comment_added: "Comment added",
  comment_edited: "Comment edited",
  comment_deleted: "Comment deleted",
  document_uploaded: "Document uploaded",
  document_verified: "Document verified",
  document_deleted: "Document deleted",
  reviewer_assigned: "Reviewer assigned",
  reviewer_removed: "Reviewer removed",
  score_added: "Score recorded",
  rejected: "Candidate rejected",
  converted: "Converted to employee",
};

function describe(entry: PipelineAuditEntry): string {
  const base = ACTION_LABELS[entry.action] ?? entry.action.replace(/_/g, " ");
  const d = entry.details ?? {};
  const extra =
    (typeof d.label === "string" && d.label) ||
    (typeof d.reviewerName === "string" && d.reviewerName) ||
    (typeof d.reason === "string" && d.reason) ||
    (typeof d.status === "string" && d.status) ||
    (typeof d.score === "number" && `${d.score}/5`) ||
    "";
  return extra ? `${base} — ${extra}` : base;
}

export function PipelineActivityLog({ pipelineId, refreshKey = 0 }: PipelineActivityLogProps) {
  const [filter, setFilter] = useState("all");
  const entries = useMemo(() => reviewApi.auditLog(pipelineId), [pipelineId, refreshKey]);

  const shown = entries.filter((e) => (filter === "all" ? true : e.actorType === filter));

  return (
    <div className="space-y-4 max-w-3xl">
      <Select
        label="Filter by actor"
        className="max-w-[220px]"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        options={[
          { value: "all", label: "All activity" },
          { value: "hr", label: "HR actions" },
          { value: "candidate", label: "Candidate actions" },
          { value: "system", label: "System" },
        ]}
      />
      <Card>
        {shown.length === 0 ? (
          <EmptyState title="No activity recorded" subtitle="Actions on this pipeline will be logged here." />
        ) : (
          <ol className="relative pl-5">
            {shown.map((e) => (
              <li key={e.id} className="relative pb-5 last:pb-0 border-l border-[#E5E5E3] pl-5 last:border-l-transparent">
                <span
                  className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full"
                  style={{ background: "var(--tenant-primary)" }}
                  aria-hidden
                />
                <p className="text-[13px] text-[#0A0A0A]">{describe(e)}</p>
                <p className="text-[12px] text-[#9CA3AF]">
                  {e.actorName} · {new Date(e.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
