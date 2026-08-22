import { useMemo, useState } from "react";
import { FileUpload } from "@/lib/components/ui/FileUpload";
import { OcrExtractedFieldsReview } from "@/lib/components/ai";
import type { EmployeeDocument, DocumentType } from "@/lib/types/employee";
import type { EmployeeDraft } from "./types";

const OCR_ELIGIBLE: DocumentType[] = ["aadhaar", "pan", "passport"];

const SLOTS: Array<{ type: DocumentType; label: string; required: boolean }> = [
  { type: "aadhaar", label: "Aadhaar Card", required: true },
  { type: "pan", label: "PAN Card", required: true },
  { type: "passport", label: "Passport", required: false },
  { type: "education_certificate", label: "Education Certificate", required: false },
  { type: "previous_experience", label: "Previous Experience Letter", required: false },
];

export interface StepDocumentsProps {
  draft: EmployeeDraft;
  onChange: (patch: Partial<EmployeeDraft>) => void;
}

export function StepDocuments({ draft, onChange }: StepDocumentsProps) {
  const docs = useMemo(() => draft.documents ?? [], [draft.documents]);
  const [ocrTrigger, setOcrTrigger] = useState<Record<string, number>>({});
  const setDoc = (type: DocumentType, file: File | null, label: string) => {
    const others = docs.filter((d) => d.type !== type);
    if (!file) return onChange({ documents: others });
    const next: EmployeeDocument = {
      id: type + "_" + Date.now(),
      type,
      label,
      status: "uploaded",
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
    };
    onChange({ documents: [...others, next] });
    if (OCR_ELIGIBLE.includes(type)) {
      setOcrTrigger((s) => ({ ...s, [type]: Date.now() }));
    }
  };
  const missingRequired = SLOTS.filter((s) => s.required && !docs.some((d) => d.type === s.type)).length;
  return (
    <div className="space-y-4">
      {SLOTS.map((s) => {
        const existing = docs.find((d) => d.type === s.type);
        return (
          <div key={s.type} className="rounded-md border border-[#E5E5E3] bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[14px] font-medium text-[#0A0A0A]">
                {s.label}{" "}
                <span className={"text-[11px] uppercase tracking-[0.08em] ml-2 " + (s.required ? "text-[#DC2626]" : "text-[#6B6B6B]")}>
                  {s.required ? "Required" : "Optional"}
                </span>
              </p>
            </div>
            <FileUpload
              onFileSelect={(f) => setDoc(s.type, f, s.label)}
              onFileRemove={() => setDoc(s.type, null, s.label)}
              currentFile={existing?.fileName ? { name: existing.fileName, sizeKB: 120 } : null}
            />
            {existing && OCR_ELIGIBLE.includes(s.type) && ocrTrigger[s.type] && (
              <div className="mt-3">
                <OcrExtractedFieldsReview
                  documentType={s.type}
                  triggerKey={ocrTrigger[s.type]}
                  formValues={{ dateOfBirth: draft.dateOfBirth, aadhaarNumber: draft.aadhaarNumber, panNumber: draft.panNumber }}
                  onApplyFields={(patch) => onChange(patch as Partial<EmployeeDraft>)}
                />
              </div>
            )}
          </div>
        );
      })}
      {missingRequired > 0 && draft.employmentType === "full_time" && (
        <p className="text-[12px] text-[#92400E] bg-[#FEF3C7] rounded-sm px-3 py-2">
          {missingRequired} required document{missingRequired > 1 ? "s" : ""} missing. Aadhaar and PAN are required for full-time employees.
        </p>
      )}
    </div>
  );
}

export function validateDocuments(d: EmployeeDraft): Record<string, string> {
  const e: Record<string, string> = {};
  if (d.employmentType === "full_time") {
    const types = new Set((d.documents ?? []).map((x) => x.type));
    if (!types.has("aadhaar")) e.aadhaar = "Aadhaar required";
    if (!types.has("pan")) e.pan = "PAN required";
  }
  return e;
}