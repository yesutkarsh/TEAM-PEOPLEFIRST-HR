/** Inline preview for pipeline documents — images render directly, PDFs in an object frame. */
import { useEffect, useMemo, useState } from "react";
import { Button, Modal } from "@/lib/components/ui";
import type { PipelineDocument } from "@/lib/types/candidate";

export interface FilePreviewModalProps {
  doc: PipelineDocument | null;
  onClose: () => void;
}

/** Handles both a base64 data URI (mock) and a signed URL (BACKEND). */
function toObjectUrl(src: string): { url: string; revoke: boolean } | null {
  if (!src) return null;
  if (!src.startsWith("data:")) return { url: src, revoke: false };
  try {
    const [head, b64] = src.split(",");
    const mime = head.slice(5).replace(";base64", "") || "application/octet-stream";
    const bin = atob(b64 ?? "");
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return { url: URL.createObjectURL(new Blob([bytes], { type: mime })), revoke: true };
  } catch {
    return null;
  }
}

export function FilePreviewModal({ doc, onClose }: FilePreviewModalProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const src = doc?.fileData ?? "";

  useEffect(() => {
    setFailed(false);
    if (!doc || !src) {
      setObjectUrl(null);
      return;
    }
    const made = toObjectUrl(src);
    if (!made) {
      setFailed(true);
      setObjectUrl(null);
      return;
    }
    setObjectUrl(made.url);
    return () => {
      if (made.revoke) URL.revokeObjectURL(made.url);
    };
  }, [doc?.id, src]);

  const kind = useMemo(() => {
    const t = doc?.fileType ?? "";
    if (t.startsWith("image/")) return "image" as const;
    if (t === "application/pdf") return "pdf" as const;
    return "other" as const;
  }, [doc?.fileType]);

  if (!doc) return null;

  return (
    <Modal open onClose={onClose} title={doc.label} className="max-w-[720px]">
      <div className="min-h-[280px] flex items-center justify-center rounded-md border border-[#E5E5E3] bg-[#FAFAF8] overflow-hidden">
        {failed || !objectUrl ? (
          <p className="text-[13px] text-[#6B6B6B] px-6 py-10 text-center">
            Couldn&apos;t preview this file. It may be corrupted or in an unsupported format.
          </p>
        ) : kind === "image" ? (
          <img src={objectUrl} alt={doc.label} className="max-h-[520px] w-auto object-contain" onError={() => setFailed(true)} />
        ) : kind === "pdf" ? (
          <object data={objectUrl} type="application/pdf" className="w-full h-[520px]" aria-label={doc.label}>
            <p className="text-[13px] text-[#6B6B6B] px-6 py-10 text-center">
              Preview not available in this browser. Download the file to view it.
            </p>
          </object>
        ) : (
          <p className="text-[13px] text-[#6B6B6B] px-6 py-10 text-center">Preview not available for this file type.</p>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-[12px] text-[#9CA3AF]">{doc.fileName} · {(doc.fileSizeBytes / 1024).toFixed(0)} KB</p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
          <a href={objectUrl ?? src} download={doc.fileName}>
            <Button size="sm">Download</Button>
          </a>
        </div>
      </div>
    </Modal>
  );
}
