/** Candidate + HR document vault for a pipeline. */
import { useCallback, useEffect, useState } from "react";
import { Button, Card, ConfirmDialog, EmptyState, showToast } from "@/lib/components/ui";
import { PermissionGuard } from "@/lib/components/rbac";
import { reviewApi } from "@/lib/api/candidates";
import type { PipelineDocument } from "@/lib/types/candidate";
import { DocumentItem } from "./DocumentItem";
import { DocumentUploadForm } from "./DocumentUploadForm";
import { FilePreviewModal } from "./FilePreviewModal";

export interface DocumentVaultProps {
  pipelineId: string;
  onCountChange?: (count: number) => void;
}

export function DocumentVault({ pipelineId, onCountChange }: DocumentVaultProps) {
  const [docs, setDocs] = useState<PipelineDocument[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState<PipelineDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PipelineDocument | null>(null);

  const load = useCallback(() => {
    const list = reviewApi.documents(pipelineId);
    setDocs(list);
    onCountChange?.(list.length);
  }, [pipelineId, onCountChange]);

  useEffect(() => { load(); }, [load]);

  const toggleVerify = async (doc: PipelineDocument) => {
    const r = await reviewApi.setDocumentVerified(doc, !doc.isVerified);
    if (r.data) {
      showToast(doc.isVerified ? "Verification removed." : "Document verified.", "success");
      load();
    }
  };

  const remove = async (doc: PipelineDocument) => {
    await reviewApi.deleteDocument(doc);
    showToast("Document deleted.", "success");
    load();
  };

  const fromCandidate = docs.filter((d) => d.uploadedBy === "candidate");
  const fromHr = docs.filter((d) => d.uploadedBy === "hr");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Candidate documents</p>
        <PermissionGuard permission="employees.manage_docs">
          <Button size="sm" onClick={() => setUploadOpen(true)}>Upload document</Button>
        </PermissionGuard>
      </div>

      {docs.length === 0 ? (
        <Card>
          <EmptyState
            title="No documents yet"
            subtitle="Files the candidate uploads and anything HR adds to this pipeline will appear here."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <Section title="From candidate" docs={fromCandidate} onView={setPreview} onToggleVerify={toggleVerify} />
          <Section title="From HR" docs={fromHr} onView={setPreview} onToggleVerify={toggleVerify} onDelete={setDeleteTarget} />
        </div>
      )}

      <DocumentUploadForm open={uploadOpen} pipelineId={pipelineId} onClose={() => setUploadOpen(false)} onUploaded={load} />
      <FilePreviewModal doc={preview} onClose={() => setPreview(null)} />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete this document?"
        description={`"${deleteTarget?.label ?? ""}" will be permanently removed from this pipeline.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={async () => { if (deleteTarget) await remove(deleteTarget); }}
      />
    </div>
  );
}

function Section({
  title,
  docs,
  onView,
  onToggleVerify,
  onDelete,
}: {
  title: string;
  docs: PipelineDocument[];
  onView: (d: PipelineDocument) => void;
  onToggleVerify: (d: PipelineDocument) => void;
  onDelete?: (d: PipelineDocument) => void;
}) {
  return (
    <Card>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B] mb-1">{title}</p>
      {docs.length === 0 ? (
        <p className="text-[13px] text-[#6B6B6B] py-2">Nothing here yet.</p>
      ) : (
        <ul>
          {docs.map((d) => (
            <DocumentItem key={d.id} doc={d} onView={onView} onToggleVerify={onToggleVerify} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </Card>
  );
}
