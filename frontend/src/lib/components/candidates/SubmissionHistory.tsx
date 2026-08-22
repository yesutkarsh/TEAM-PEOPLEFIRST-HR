/** All submissions for a pipeline, with a version picker and compare mode. */
import { useState } from "react";
import { Alert, Card } from "@/lib/components/ui";
import { cn } from "@/lib/utils";
import type { CandidateSubmission } from "@/lib/types/candidate";
import type { FormSchema } from "@/lib/types/formSchema";
import { SubmissionViewer } from "./SubmissionViewer";
import { SubmissionDiff } from "./SubmissionDiff";

export interface SubmissionHistoryProps {
  submissions: CandidateSubmission[];
  form: FormSchema | null;
}

export function SubmissionHistory({ submissions, form }: SubmissionHistoryProps) {
  const [selected, setSelected] = useState<string>("latest");

  if (submissions.length === 0) {
    return (
      <Card>
        <p className="text-[13px] text-[#6B6B6B]">No submission yet.</p>
      </Card>
    );
  }

  if (submissions.length === 1) {
    return (
      <div className="space-y-4">
        {!form && <MissingSchemaNote />}
        <SubmissionViewer submissions={submissions} form={form} />
      </div>
    );
  }

  const last = submissions.length - 1;
  const pills = [
    ...submissions.map((s, i) => ({
      id: String(i),
      label: `Submission ${s.submissionNumber}${i === last ? " (latest)" : ""}`,
    })),
    { id: "compare", label: "↔ Compare" },
  ];
  const activeId = selected === "latest" ? String(last) : selected;

  return (
    <div className="space-y-4">
      {!form && <MissingSchemaNote />}
      <div className="flex flex-wrap gap-2">
        {pills.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelected(p.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12px] border transition-colors",
              activeId === p.id
                ? "border-[var(--tenant-primary)] text-[var(--tenant-primary)] bg-[color-mix(in_srgb,var(--tenant-primary)_8%,transparent)]"
                : "border-[#E5E5E3] text-[#6B6B6B] hover:bg-[#F2F2F0]",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {activeId === "compare" ? (
        <SubmissionDiff left={submissions[last - 1]} right={submissions[last]} form={form} />
      ) : (
        <SubmissionViewer key={activeId} submissions={[submissions[Number(activeId)]]} form={form} />
      )}
    </div>
  );
}

function MissingSchemaNote() {
  return (
    <Alert variant="warning">
      The form used for this submission is no longer available. Field names may not display correctly.
    </Alert>
  );
}
