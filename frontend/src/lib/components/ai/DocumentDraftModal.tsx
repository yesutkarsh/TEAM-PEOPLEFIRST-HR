/** AI document drafting modal — type select, missing-data guard, editable draft, review-gated send. */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Button, Checkbox, ConfirmDialog, Modal, RadioGroup, Spinner, Textarea, showToast,
} from "@/lib/components/ui";
import { generateDraft, markDraftSent } from "@/lib/api/ai";
import { DRAFT_DOCUMENT_LABELS, type DraftDocument, type DraftDocumentType } from "@/lib/types/ai";
import type { Employee } from "@/lib/types/employee";
import { AiBadge } from "./AiBadge";

const TYPE_OPTIONS = (Object.keys(DRAFT_DOCUMENT_LABELS) as DraftDocumentType[]).map((v) => ({
  value: v,
  label: DRAFT_DOCUMENT_LABELS[v],
}));

export interface DocumentDraftModalProps {
  open: boolean;
  onClose: () => void;
  employee: Employee;
  /** Pre-fill and skip the type step, e.g. from a helpdesk document-request ticket. */
  presetType?: DraftDocumentType;
  sourceTicketId?: string;
  onSent?: (draft: DraftDocument) => void;
}

function missingDataFor(type: DraftDocumentType, e: Employee): string[] {
  const missing: string[] = [];
  if (type === "offer_letter" || type === "appointment_letter") {
    if (!e.designationId) missing.push("Designation");
    if (!e.ctcAnnual) missing.push("Annual CTC");
    if (!e.dateOfJoining) missing.push("Date of joining");
  }
  if (type === "salary_certificate" || type === "increment_letter") {
    if (!e.ctcAnnual) missing.push("Annual CTC");
  }
  if (type === "experience_letter") {
    if (!e.dateOfJoining) missing.push("Date of joining");
  }
  return missing;
}

export function DocumentDraftModal({ open, onClose, employee, presetType, sourceTicketId, onSent }: DocumentDraftModalProps) {
  const [type, setType] = useState<DraftDocumentType>(presetType ?? "offer_letter");
  const [customPrompt, setCustomPrompt] = useState("");
  const [draft, setDraft] = useState<DraftDocument | null>(null);
  const [content, setContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmRegenOpen, setConfirmRegenOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType(presetType ?? "offer_letter");
    setCustomPrompt("");
    setDraft(null);
    setContent("");
    setReviewed(false);
  }, [open, presetType]);

  const missing = missingDataFor(type, employee);

  const generate = async () => {
    setGenerating(true);
    const r = await generateDraft({ employeeId: employee.id, type, sourceTicketId });
    setGenerating(false);
    if (r.error || !r.data) return showToast(r.error?.message ?? "Could not generate draft.", "error");
    setDraft(r.data);
    setContent(r.data.generatedContent);
    setReviewed(false);
  };

  const wasEdited = draft ? content !== draft.generatedContent : false;

  const regenerate = async () => {
    if (wasEdited) {
      setConfirmRegenOpen(true);
      return;
    }
    await generate();
  };

  const downloadPdf = () => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${DRAFT_DOCUMENT_LABELS[type].replace(/\s+/g, "-")}-${employee.employeeCode}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const send = async () => {
    if (!draft) return;
    setSending(true);
    const r = await markDraftSent(draft.id);
    setSending(false);
    if (r.error) return showToast(r.error.message, "error");
    showToast("Document sent to employee.", "success");
    const sent = r.data?.find((d) => d.id === draft.id) ?? draft;
    onSent?.(sent);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Generate document with AI" className="max-w-4xl">
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <AiBadge />
          <p className="text-[13px] text-[#6B6B6B]">for {employee.firstName} {employee.lastName}</p>
        </div>

        {!presetType && (
          <div>
            <p className="text-[13px] font-medium text-[#0A0A0A] mb-2">Document type</p>
            <RadioGroup options={TYPE_OPTIONS} value={type} onChange={(v) => { setType(v as DraftDocumentType); setDraft(null); }} orientation="horizontal" className="flex-wrap" />
          </div>
        )}

        {type === "custom" && (
          <Textarea
            label="What should this document say?"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Describe the purpose and key points for this document…"
          />
        )}

        {missing.length > 0 ? (
          <div className="rounded-md border border-[#F59E0B] bg-[#FEF3C7] px-3 py-2 text-[13px] text-[#92400E]">
            Cannot generate this document yet. Missing: {missing.join(", ")}.{" "}
            <Link to="/employees/$employeeId" params={{ employeeId: employee.id }} className="underline font-medium">
              Update employee profile →
            </Link>
          </div>
        ) : !draft ? (
          <Button onClick={() => void generate()} loading={generating}>
            {generating ? "Drafting…" : "Generate draft →"}
          </Button>
        ) : (
          <div className="space-y-3">
            {generating ? (
              <p className="text-[13px] text-[#6B6B6B] flex items-center gap-2"><Spinner size={14} /> Drafting…</p>
            ) : (
              <Textarea label="Draft" value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[220px]" />
            )}
            <Checkbox
              label="I have reviewed this draft and confirm it is accurate."
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void regenerate()} disabled={generating}>Regenerate ↻</Button>
              <Button variant="secondary" disabled={!reviewed} onClick={downloadPdf}>Download PDF</Button>
              <Button disabled={!reviewed} loading={sending} onClick={() => void send()}>Send to employee →</Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmRegenOpen}
        onOpenChange={setConfirmRegenOpen}
        title="Discard your edits?"
        description="Regenerating will replace your edited draft with a fresh AI draft."
        confirmLabel="Regenerate"
        variant="warning"
        onConfirm={generate}
      />
    </Modal>
  );
}
