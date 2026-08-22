/** Status-contextual HR review actions for a hiring pipeline. */
import { useEffect, useState } from "react";
import { Button, Card, ConfirmDialog, SlideOver, Textarea, showToast } from "@/lib/components/ui";
import { candidatesApi } from "@/lib/api/candidates";
import type { HiringPipeline } from "@/lib/types/candidate";

export interface HRReviewPanelProps {
  pipeline: HiringPipeline;
  onChanged: () => void;
}

export function HRReviewPanel({ pipeline, onChanged }: HRReviewPanelProps) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [candidateNote, setCandidateNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [notes, setNotes] = useState(pipeline.hrNotes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => setNotes(pipeline.hrNotes ?? ""), [pipeline.id, pipeline.hrNotes]);

  const canReview = pipeline.status === "submitted" || pipeline.status === "resubmitting";
  const canApprove = canReview || pipeline.status === "changes_requested";
  const canReject = ["submitted", "changes_requested", "approved", "resubmitting"].includes(pipeline.status);

  const doApprove = async () => {
    const r = await candidatesApi.approve(pipeline.id);
    if (r.data) {
      showToast("Application approved", "success");
      onChanged();
    }
  };

  const doReject = async () => {
    if (!rejectReason.trim()) {
      showToast("Add a reason for rejection.", "error");
      return;
    }
    const r = await candidatesApi.reject(pipeline.id, rejectReason.trim());
    if (r.data) {
      showToast("Candidate rejected", "success");
      setRejectReason("");
      setRejectOpen(false);
      onChanged();
    }
  };

  const doRequestChanges = async () => {
    if (!candidateNote.trim()) {
      showToast("Add a note for the candidate.", "error");
      return;
    }
    const r = await candidatesApi.requestChanges(pipeline.id, candidateNote.trim(), internalNote.trim() || undefined);
    if (r.data) {
      showToast("Changes requested from candidate", "success");
      setChangesOpen(false);
      setCandidateNote("");
      setInternalNote("");
      onChanged();
    }
  };

  const saveNotesOnBlur = async () => {
    if (notes === (pipeline.hrNotes ?? "")) return;
    setSavingNotes(true);
    await candidatesApi.saveHrNotes(pipeline.id, notes);
    setSavingNotes(false);
    showToast("Notes saved", "success");
  };

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-[13px] font-semibold text-[#0A0A0A] mb-3">HR review</h3>
        <div className="flex flex-wrap gap-2">
          {canApprove && (
            <Button size="sm" onClick={() => setApproveOpen(true)}>
              Approve
            </Button>
          )}
          {canReview && (
            <Button size="sm" variant="secondary" onClick={() => setChangesOpen(true)}>
              Request changes
            </Button>
          )}
          {canReject && (
            <Button size="sm" variant="danger" onClick={() => setRejectOpen(true)}>
              Reject
            </Button>
          )}
          {!canReview && !canReject && pipeline.status !== "approved" && (
            <p className="text-[13px] text-[#6B6B6B]">No review actions available at this stage.</p>
          )}
        </div>
      </Card>

      {pipeline.status === "approved" && (
        <Card className="border-dashed">
          <h3 className="text-[13px] font-semibold text-[#0A0A0A] mb-1">Offer letter</h3>
          <p className="text-[13px] text-[#6B6B6B] mb-3">
            Offer generation and e-sign will be available in a future update (Phase E).
          </p>
          <Button size="sm" variant="secondary" disabled>
            Generate offer letter
          </Button>
        </Card>
      )}

      {(pipeline.status === "countersigned" || pipeline.status === "onboarding") && (
        <Card className="border-dashed">
          <h3 className="text-[13px] font-semibold text-[#0A0A0A] mb-1">Convert to employee</h3>
          <p className="text-[13px] text-[#6B6B6B] mb-3">
            Converting this candidate into a full employee record will be available in a future update (Phase F).
          </p>
          <Button size="sm" variant="secondary" disabled>
            Convert to employee
          </Button>
        </Card>
      )}

      <Card>
        <h3 className="text-[13px] font-semibold text-[#0A0A0A] mb-3">Internal notes</h3>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotesOnBlur}
          placeholder="Notes visible only to HR…"
          rows={4}
        />
        {savingNotes && <p className="mt-1 text-[12px] text-[#9CA3AF]">Saving…</p>}
      </Card>

      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve this application?"
        description="The candidate's stage will move to Approved."
        confirmLabel="Approve"
        onConfirm={doApprove}
      />

      <SlideOver
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject candidate"
        description="This action is final and the candidate will be notified."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={doReject}>Reject</Button>
          </>
        }
      >
        <Textarea
          label="Reason for rejection"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Shared internally as a record…"
          rows={4}
        />
      </SlideOver>

      <SlideOver
        open={changesOpen}
        onClose={() => setChangesOpen(false)}
        title="Request changes"
        description="The candidate will see the note below and be able to resubmit."
        footer={
          <>
            <Button variant="secondary" onClick={() => setChangesOpen(false)}>Cancel</Button>
            <Button onClick={doRequestChanges}>Send request</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Textarea
            label="Note to candidate"
            value={candidateNote}
            onChange={(e) => setCandidateNote(e.target.value)}
            placeholder="Explain what needs to change…"
            rows={4}
          />
          <Textarea
            label="Internal notes (optional)"
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            placeholder="Not visible to the candidate…"
            rows={3}
          />
        </div>
      </SlideOver>
    </div>
  );
}
