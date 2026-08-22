/** SlideOver body — HR uploads a document straight onto the pipeline. */
import { useState } from "react";
import { Button, FileUpload, Input, RadioGroup, SlideOver, showToast } from "@/lib/components/ui";
import { reviewApi } from "@/lib/api/candidates";
import type { PipelineDocument } from "@/lib/types/candidate";

const TYPES = [
  { value: "id_proof", label: "ID proof" },
  { value: "resume", label: "Resume" },
  { value: "portfolio", label: "Portfolio" },
  { value: "certificate", label: "Certificate" },
  { value: "other", label: "Other" },
];

export interface DocumentUploadFormProps {
  open: boolean;
  pipelineId: string;
  onClose: () => void;
  onUploaded: () => void;
}

export function DocumentUploadForm({ open, pipelineId, onClose, onUploaded }: DocumentUploadFormProps) {
  const [label, setLabel] = useState("");
  const [docType, setDocType] = useState<PipelineDocument["documentType"]>("other");
  const [file, setFile] = useState<{ name: string; sizeKB: number; type: string; dataUrl: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const reset = () => { setLabel(""); setDocType("other"); setFile(null); setError(undefined); };

  const onFileSelect = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => setFile({ name: f.name, sizeKB: Math.round(f.size / 1024), type: f.type || "application/octet-stream", dataUrl: String(reader.result) });
    reader.onerror = () => setError("Couldn't read that file. Try again.");
    reader.readAsDataURL(f);
  };

  const submit = async () => {
    if (!label.trim()) { setError("Add a label for this document."); return; }
    if (!file) { setError("Choose a file to upload."); return; }
    setSaving(true);
    const r = await reviewApi.uploadDocument(pipelineId, {
      fileName: file.name,
      fileType: file.type,
      fileSizeBytes: file.sizeKB * 1024,
      fileData: file.dataUrl,
      documentType: docType,
      label,
    });
    setSaving(false);
    if (r.error) { setError(r.error.message); return; }
    showToast("Document uploaded.", "success");
    reset();
    onUploaded();
    onClose();
  };

  return (
    <SlideOver
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Upload document"
      description="Stored against this hiring pipeline and visible to HR only."
      footer={
        <>
          <Button variant="secondary" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={submit} loading={saving} disabled={!file || !label.trim()}>Upload</Button>
        </>
      }
    >
      <div className="space-y-5">
        <Input label="Label" required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Offer acceptance letter" />
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-[#0A0A0A]">Document type</p>
          <RadioGroup options={TYPES} value={docType} onChange={(v) => setDocType(v as PipelineDocument["documentType"])} />
        </div>
        <FileUpload
          label="File"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          maxSizeMB={10}
          onFileSelect={onFileSelect}
          onFileRemove={() => setFile(null)}
          currentFile={file ? { name: file.name, sizeKB: file.sizeKB } : null}
          error={error}
        />
      </div>
    </SlideOver>
  );
}
