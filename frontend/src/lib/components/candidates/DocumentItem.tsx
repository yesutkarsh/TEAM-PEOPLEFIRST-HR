/** Single document row inside the candidate document vault. */
import { Badge, Button } from "@/lib/components/ui";
import { FileText, Image as ImageIcon, File } from "lucide-react";
import { PermissionGuard } from "@/lib/components/rbac";
import type { PipelineDocument } from "@/lib/types/candidate";

const TYPE_LABELS: Record<PipelineDocument["documentType"], string> = {
  id_proof: "ID proof",
  resume: "Resume",
  portfolio: "Portfolio",
  certificate: "Certificate",
  other: "Other",
};

export interface DocumentItemProps {
  doc: PipelineDocument;
  onView: (doc: PipelineDocument) => void;
  onToggleVerify: (doc: PipelineDocument) => void;
  onDelete?: (doc: PipelineDocument) => void;
}

export function DocumentItem({ doc, onView, onToggleVerify, onDelete }: DocumentItemProps) {
  const Icon = doc.fileType.startsWith("image/") ? ImageIcon : doc.fileType === "application/pdf" ? FileText : File;
  return (
    <li className="flex items-center gap-3 py-3 border-b border-[#E5E5E3] last:border-b-0">
      <Icon size={18} className="text-[#6B6B6B] shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-medium text-[#0A0A0A] truncate">{doc.label}</p>
          <Badge variant="default">{TYPE_LABELS[doc.documentType]}</Badge>
          {doc.isVerified && <Badge variant="success">Verified</Badge>}
        </div>
        <p className="text-[12px] text-[#9CA3AF] truncate">
          {doc.fileName} · {(doc.fileSizeBytes / 1024).toFixed(0)} KB · {doc.uploadedBy === "hr" ? "HR" : "Candidate"} ·{" "}
          {new Date(doc.uploadedAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button type="button" className="text-[12px] text-[var(--tenant-primary)] hover:underline" onClick={() => onView(doc)}>
          View
        </button>
        <a href={doc.fileData} download={doc.fileName} className="text-[12px] text-[#0A0A0A] hover:underline">
          Download
        </a>
        <PermissionGuard permission="employees.manage_docs">
          <Button size="sm" variant="secondary" onClick={() => onToggleVerify(doc)}>
            {doc.isVerified ? "Unverify" : "Verify"}
          </Button>
        </PermissionGuard>
        {onDelete && doc.uploadedBy === "hr" && (
          <PermissionGuard permission="employees.manage_docs">
            <button type="button" className="text-[12px] text-[#DC2626] hover:underline" onClick={() => onDelete(doc)}>
              Delete
            </button>
          </PermissionGuard>
        )}
      </div>
    </li>
  );
}
