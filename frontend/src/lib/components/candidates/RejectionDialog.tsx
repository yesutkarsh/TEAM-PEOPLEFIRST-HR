/** Reject one or many candidates with a structured reason. */
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Input, Modal, RadioGroup, Textarea } from "@/lib/components/ui";
import { reviewApi } from "@/lib/api/candidates";
import { REJECTION_CATEGORY_LABELS, type RejectionReason } from "@/lib/types/candidate";

export interface RejectionDialogProps {
  open: boolean;
  onClose: () => void;
  /** Plural copy + bulk summary when more than one pipeline is passed. */
  pipelineIds: string[];
  onDone: (summary?: { processed: number; skipped: number }) => void;
}

const OTHER = "__other__";

export function RejectionDialog({ open, onClose, pipelineIds, onDone }: RejectionDialogProps) {
  const [reasons, setReasons] = useState<RejectionReason[]>([]);
  const [selected, setSelected] = useState("");
  const [custom, setCustom] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReasons(reviewApi.rejectionReasons().filter((r) => r.isActive));
    setSelected("");
    setCustom("");
    setNotes("");
    setError(null);
  }, [open]);

  const options = useMemo(
    () => [
      ...reasons.map((r) => ({ value: r.id, label: `${r.label} · ${REJECTION_CATEGORY_LABELS[r.category]}` })),
      { value: OTHER, label: "Other (write your own)" },
    ],
    [reasons],
  );

  const many = pipelineIds.length > 1;

  const confirm = async () => {
    const chosen = reasons.find((r) => r.id === selected);
    const label = selected === OTHER ? custom.trim() : chosen?.label;
    if (!label) { setError(selected === OTHER ? "Write the reason for rejection." : "Pick a rejection reason."); return; }
    setError(null);
    setBusy(true);
    const reason = { id: selected === OTHER ? undefined : chosen?.id, label };
    if (many) {
      const r = await reviewApi.bulkReject(pipelineIds, reason, notes || undefined);
      setBusy(false);
      onDone(r.data ?? undefined);
    } else {
      const r = await reviewApi.rejectWithReason(pipelineIds[0], reason, notes || undefined);
      setBusy(false);
      if (r.error) { setError(r.error.message); return; }
      onDone();
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={many ? `Reject ${pipelineIds.length} candidates` : "Reject candidate"}>
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <p className="text-[13px] text-[#6B6B6B]">
          The reason is recorded on the hiring pipeline. Internal notes are never shared with the candidate.
        </p>
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-[#0A0A0A]">Reason</p>
          <RadioGroup options={options} value={selected} onChange={setSelected} />
        </div>
        {selected === OTHER && (
          <Input label="Custom reason" required value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Reason for rejection" />
        )}
        <Textarea label="Internal notes (optional)" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        {many && (
          <p className="text-[12px] text-[#9CA3AF]">Candidates already hired or rejected will be skipped.</p>
        )}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" loading={busy} onClick={confirm}>
          {many ? "Reject candidates" : "Reject candidate"}
        </Button>
      </div>
    </Modal>
  );
}
