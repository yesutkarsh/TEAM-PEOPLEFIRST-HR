/**
 * Auto-fill review panel for OCR extraction on a just-uploaded document.
 * High-confidence fields on empty form fields batch-apply; low-confidence fields
 * are individually gated behind "Verify this" + their own Apply button; conflicts with
 * already-entered values render a side-by-side diff.
 */
import { useEffect, useState } from "react";
import { Button, Spinner } from "@/lib/components/ui";
import { extractOcrFields } from "@/lib/api/ai";
import type { OcrExtractedField } from "@/lib/types/ai";
import type { DocumentType } from "@/lib/types/employee";
import { AiBadge } from "./AiBadge";
import { OcrFieldDiffRow } from "./OcrFieldDiffRow";

/** Maps OCR field keys to a target key on the shared draft form state. */
const FIELD_TARGET_MAP: Record<string, string> = {
  dob: "dateOfBirth",
  aadhaar_no: "aadhaarNumber",
  pan_no: "panNumber",
};

export interface OcrExtractedFieldsReviewProps {
  documentType: DocumentType;
  /** Bump this (e.g. Date.now()) whenever a new file is uploaded to retrigger extraction. */
  triggerKey: number;
  formValues: Record<string, string | undefined>;
  onApplyFields: (patch: Record<string, string>) => void;
}

export function OcrExtractedFieldsReview({ documentType, triggerKey, formValues, onApplyFields }: OcrExtractedFieldsReviewProps) {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [fields, setFields] = useState<OcrExtractedField[]>([]);
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set());
  const [batchApplied, setBatchApplied] = useState(false);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    setAppliedKeys(new Set());
    setBatchApplied(false);
    void extractOcrFields(documentType)
      .then((r) => {
        if (!alive) return;
        if (r.error || !r.data) {
          setStatus("error");
          return;
        }
        setFields(r.data.fields);
        setStatus("success");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [documentType, triggerKey]);

  if (status === "loading") {
    return (
      <p className="text-[13px] text-[#6B6B6B] flex items-center gap-2">
        <Spinner size={14} /> Reading document…
      </p>
    );
  }

  if (status === "error") {
    return (
      <p className="text-[13px] text-[#6B6B6B]">
        Couldn't read this document automatically. Please fill the fields manually below.
      </p>
    );
  }

  const target = (f: OcrExtractedField) => FIELD_TARGET_MAP[f.fieldKey];
  const applicableFields = fields.filter((f) => !!target(f));
  const isEmptyOnForm = (f: OcrExtractedField) => !formValues[target(f)] || formValues[target(f)]!.trim() === "";
  const isConflict = (f: OcrExtractedField) => {
    const key = target(f);
    const v = formValues[key];
    return !!v && v.trim() !== "" && v.trim() !== f.extractedValue.trim();
  };

  const batchable = applicableFields.filter((f) => f.confidence === "high" && isEmptyOnForm(f) && !appliedKeys.has(target(f)));

  const applyOne = (f: OcrExtractedField) => {
    const key = target(f);
    onApplyFields({ [key]: f.extractedValue });
    setAppliedKeys((s) => new Set(s).add(key));
  };

  const applyAll = () => {
    const patch: Record<string, string> = {};
    for (const f of batchable) patch[target(f)] = f.extractedValue;
    onApplyFields(patch);
    setAppliedKeys((s) => {
      const next = new Set(s);
      batchable.forEach((f) => next.add(target(f)));
      return next;
    });
    setBatchApplied(true);
  };

  return (
    <div className="rounded-md border border-[#E5E5E3] bg-white p-3 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <AiBadge />
          <p className="text-[13px] font-medium text-[#0A0A0A]">Fields detected from this document</p>
        </div>
        {batchable.length > 0 && !batchApplied && (
          <Button size="sm" variant="secondary" onClick={applyAll}>Apply all →</Button>
        )}
      </div>
      <div className="space-y-2">
        {fields.map((f) => (
          <OcrFieldDiffRow
            key={f.fieldKey}
            field={f}
            formValue={target(f) ? formValues[target(f)] : undefined}
            applicable={!!target(f)}
            applied={target(f) ? appliedKeys.has(target(f)) : false}
            onApply={() => applyOne(f)}
            onKeepFormValue={() => setAppliedKeys((s) => new Set(s).add(target(f)))}
          />
        ))}
      </div>
      {applicableFields.some(isConflict) && (
        <p className="text-[12px] text-[#6B6B6B]">Some detected values differ from what's already on this form — choose which to keep above.</p>
      )}
    </div>
  );
}
