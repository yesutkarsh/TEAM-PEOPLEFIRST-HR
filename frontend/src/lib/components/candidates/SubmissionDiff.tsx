/** Side-by-side comparison of two candidate submissions. */
import { Card, InfoTooltip } from "@/lib/components/ui";
import type { CandidateSubmission } from "@/lib/types/candidate";
import type { FormSchema } from "@/lib/types/formSchema";
import { NON_DATA_FIELD_TYPES } from "@/lib/types/formSchema";

export interface SubmissionDiffProps {
  left: CandidateSubmission;
  right: CandidateSubmission;
  form: FormSchema | null;
}

function labelFor(form: FormSchema | null, fieldId: string): string {
  const field = form?.steps
    .flatMap((s) => s.fields)
    .filter((f) => !NON_DATA_FIELD_TYPES.includes(f.type))
    .find((f) => f.id === fieldId);
  return field?.label ?? fieldId;
}

function display(value: unknown): string {
  if (value === undefined) return "__MISSING__";
  if (value === null || value === "") return "—";
  if (Array.isArray(value)) return value.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  const s = String(value);
  return s.startsWith("data:") ? "File uploaded" : s;
}

export function SubmissionDiff({ left, right, form }: SubmissionDiffProps) {
  const keys = Array.from(new Set([...Object.keys(left.responses), ...Object.keys(right.responses)]));
  const versionMismatch = left.formVersionId !== right.formVersionId;

  return (
    <Card>
      <div className="grid grid-cols-[minmax(120px,1fr)_1fr_1fr] gap-3 pb-3 border-b border-[#E5E5E3]">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Field</span>
        <span className="text-[12px] font-semibold text-[#0A0A0A]">
          Submission {left.submissionNumber} — {new Date(left.submittedAt).toLocaleDateString()}
        </span>
        <span className="text-[12px] font-semibold text-[#0A0A0A] flex items-center gap-1">
          Submission {right.submissionNumber} — {new Date(right.submittedAt).toLocaleDateString()}
          {versionMismatch && (
            <InfoTooltip content={`This submission used form version ${right.formVersionId ?? "unknown"}. Field labels may differ from the previous submission.`} />
          )}
        </span>
      </div>

      <dl className="divide-y divide-[#E5E5E3]">
        {keys.map((k) => {
          const a = display(left.responses[k]);
          const b = display(right.responses[k]);
          const added = a === "__MISSING__";
          const removed = b === "__MISSING__";
          const changed = !added && !removed && a !== b;
          const bg = added
            ? "color-mix(in srgb, #16A34A 8%, transparent)"
            : changed
              ? "color-mix(in srgb, var(--tenant-accent) 6%, transparent)"
              : undefined;
          return (
            <div key={k} className="grid grid-cols-[minmax(120px,1fr)_1fr_1fr] gap-3 py-3 text-[13px]" style={{ background: bg }}>
              <dt className="text-[#6B6B6B]">{labelFor(form, k)}</dt>
              <dd className="text-[#0A0A0A] break-words">{added ? <span className="text-[#9CA3AF]">—</span> : a}</dd>
              <dd className="text-[#0A0A0A] break-words">{removed ? <span className="text-[#9CA3AF]">Removed</span> : b}</dd>
            </div>
          );
        })}
      </dl>
    </Card>
  );
}
