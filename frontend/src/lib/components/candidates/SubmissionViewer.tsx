/** Read-only label/value viewer for a CandidateSubmission against its FormSchema. */
import { useState } from "react";
import { Card, Button } from "@/lib/components/ui";
import type { CandidateSubmission } from "@/lib/types/candidate";
import type { FormField, FormSchema } from "@/lib/types/formSchema";
import { NON_DATA_FIELD_TYPES } from "@/lib/types/formSchema";

export interface SubmissionViewerProps {
  submissions: CandidateSubmission[];
  form: FormSchema | null;
}

interface FileLike {
  name?: string;
  url?: string;
  dataUrl?: string;
}

function isFileLike(v: unknown): v is FileLike {
  return !!v && typeof v === "object" && ("url" in v || "dataUrl" in v || "name" in v);
}

function renderValue(field: FormField, value: unknown) {
  if (value === undefined || value === null || value === "") return <span className="text-[#9CA3AF]">—</span>;

  if (field.type === "signature" && typeof value === "string") {
    return <img src={value} alt={`${field.label} signature`} className="max-h-24 rounded border border-[#E5E5E3] bg-white" />;
  }

  if (field.type === "file_upload") {
    const files = Array.isArray(value) ? value : [value];
    return (
      <div className="flex flex-col gap-1">
        {files.map((f, i) => {
          if (isFileLike(f)) {
            const href = f.url ?? f.dataUrl;
            return href ? (
              <a key={i} href={href} target="_blank" rel="noreferrer" className="text-[var(--tenant-primary)] hover:underline">
                View file{f.name ? ` — ${f.name}` : ""}
              </a>
            ) : (
              <span key={i}>{f.name ?? "File uploaded"}</span>
            );
          }
          return <span key={i}>{String(f)}</span>;
        })}
      </div>
    );
  }

  if (Array.isArray(value)) return <span>{value.map((v) => String(v)).join(", ")}</span>;
  if (typeof value === "boolean") return <span>{value ? "Yes" : "No"}</span>;
  if (typeof value === "object") return <span>{JSON.stringify(value)}</span>;
  return <span>{String(value)}</span>;
}

export function SubmissionViewer({ submissions, form }: SubmissionViewerProps) {
  const [index, setIndex] = useState(submissions.length - 1);

  if (submissions.length === 0) {
    return (
      <Card>
        <h3 className="text-[13px] font-semibold text-[#0A0A0A] mb-2">Application responses</h3>
        <p className="text-[13px] text-[#6B6B6B]">No submission yet.</p>
      </Card>
    );
  }

  const submission = submissions[Math.min(Math.max(index, 0), submissions.length - 1)];
  const fields: FormField[] = form
    ? form.steps.flatMap((s) => s.fields).filter((f) => !NON_DATA_FIELD_TYPES.includes(f.type))
    : [];

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-[#0A0A0A]">Application responses</h3>
        {submissions.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={index <= 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              className="h-7 w-7 rounded-full border border-[#E5E5E3] disabled:opacity-30 hover:bg-[#F2F2F0]"
              aria-label="Previous submission"
            >
              ‹
            </button>
            <p className="text-[12px] text-[#6B6B6B]">
              Viewing submission #{submission.submissionNumber} of {submissions.length}
            </p>
            <button
              type="button"
              disabled={index >= submissions.length - 1}
              onClick={() => setIndex((i) => Math.min(submissions.length - 1, i + 1))}
              className="h-7 w-7 rounded-full border border-[#E5E5E3] disabled:opacity-30 hover:bg-[#F2F2F0]"
              aria-label="Next submission"
            >
              ›
            </button>
          </div>
        )}
      </div>
      <p className="text-[12px] text-[#9CA3AF] mb-4">
        Submitted {new Date(submission.submittedAt).toLocaleString()}
      </p>
      {fields.length === 0 ? (
        <dl className="space-y-3">
          {Object.entries(submission.responses).map(([k, v]) => (
            <div key={k} className="grid grid-cols-3 gap-3 text-[13px]">
              <dt className="text-[#6B6B6B] col-span-1">{k}</dt>
              <dd className="text-[#0A0A0A] col-span-2">{String(v)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <dl className="space-y-4">
          {fields.map((f) => (
            <div key={f.id} className="grid grid-cols-3 gap-3 text-[13px]">
              <dt className="text-[#6B6B6B] col-span-1">{f.label}</dt>
              <dd className="text-[#0A0A0A] col-span-2">{renderValue(f, submission.responses[f.id])}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}
