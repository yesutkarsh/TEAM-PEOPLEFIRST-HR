/** Single OCR-extracted field row: apply, verify-tag, or side-by-side conflict diff. */
import { Badge, Button } from "@/lib/components/ui";
import type { OcrExtractedField } from "@/lib/types/ai";

export interface OcrFieldDiffRowProps {
  field: OcrExtractedField;
  /** Current value already in the form, if any. */
  formValue?: string;
  /** Whether this field maps to a known target on the draft. */
  applicable: boolean;
  onApply: () => void;
  onKeepFormValue?: () => void;
  applied?: boolean;
}

export function OcrFieldDiffRow({ field, formValue, applicable, onApply, onKeepFormValue, applied }: OcrFieldDiffRowProps) {
  const hasConflict = applicable && !!formValue && formValue.trim() !== "" && formValue.trim() !== field.extractedValue.trim();

  return (
    <div className="rounded-sm border border-[#E5E5E3] bg-[#FAFAF8] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-[#0A0A0A]">{field.fieldLabel}</p>
        <div className="flex items-center gap-2">
          {field.confidence === "low" && <Badge variant="default" className="border border-[#F59E0B] text-[#B45309] bg-transparent">Verify this</Badge>}
          {applied && <Badge variant="success">Applied</Badge>}
        </div>
      </div>

      {hasConflict ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-sm border border-[#E5E5E3] bg-white p-2">
            <p className="text-[11px] uppercase tracking-[0.06em] text-[#6B6B6B]">Form value</p>
            <p className="text-[13px] text-[#0A0A0A] mt-0.5">{formValue}</p>
            <Button size="sm" variant="secondary" className="mt-2" onClick={onKeepFormValue}>Keep form value</Button>
          </div>
          <div className="rounded-sm border border-[#E5E5E3] bg-white p-2">
            <p className="text-[11px] uppercase tracking-[0.06em] text-[#6B6B6B]">Document value</p>
            <p className="text-[13px] text-[#0A0A0A] mt-0.5">{field.extractedValue}</p>
            <Button size="sm" variant="secondary" className="mt-2" onClick={onApply} disabled={applied}>Use document value</Button>
          </div>
        </div>
      ) : (
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-[13px] text-[#3F3F46]">{field.extractedValue}</p>
          {applicable && field.confidence === "low" && (
            <Button size="sm" variant="secondary" onClick={onApply} disabled={applied}>Apply</Button>
          )}
        </div>
      )}
    </div>
  );
}
