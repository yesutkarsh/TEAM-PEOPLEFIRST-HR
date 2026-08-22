/** Single document row inside DocumentVault. */
import { FileText, CheckCircle2, AlertCircle, Clock, Check, X } from "lucide-react";
import { FileUpload } from "@/lib/components/ui/FileUpload";
import { Badge } from "@/lib/components/ui/Badge";
import type { EmployeeDocument } from "@/lib/types/employee";

export interface DocumentItemProps {
  doc: EmployeeDocument;
  canVerify?: boolean;
  onUpload: (file: File) => void;
  onVerify?: () => void;
  onReject?: () => void;
}

import type { BadgeVariant } from "@/lib/components/ui/Badge";
const statusBadge: Record<EmployeeDocument["status"], { label: string; variant: BadgeVariant; icon: any }> = {
  pending: { label: "Pending", variant: "default", icon: Clock },
  uploaded: { label: "Uploaded", variant: "tenant-accent", icon: FileText },
  verified: { label: "Verified", variant: "success", icon: CheckCircle2 },
  rejected: { label: "Rejected", variant: "danger", icon: AlertCircle },
};

export function DocumentItem({ doc, canVerify, onUpload, onVerify, onReject }: DocumentItemProps) {
  const s = statusBadge[doc.status];
  const Icon = s.icon;

  return (
    <div className="rounded-2xl border border-[#E5E5E3] bg-white p-4 sm:p-5 shadow-xs transition-all duration-200 hover:shadow-md flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-[#FAFAF9] border border-[#F2F2F0] text-[#0A0A0A] shrink-0">
              <Icon className="w-5 h-5 text-orange-600" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-[14px] text-[#0A0A0A] truncate">{doc.label}</h4>
              {doc.uploadedAt ? (
                <p className="text-[12px] text-[#8E8E8E] font-medium">
                  Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                </p>
              ) : (
                <p className="text-[12px] text-[#8E8E8E] font-medium">Not uploaded yet</p>
              )}
            </div>
          </div>
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>

        {doc.rejectedNote && (
          <div className="flex items-start gap-2 text-[12px] text-rose-700 bg-rose-50 border border-rose-200/60 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Rejection note:</span> {doc.rejectedNote}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 pt-1 border-t border-[#F2F2F0]">
        {doc.status === "verified" ? (
          <div className="flex items-center gap-2 text-[12px] text-emerald-700 font-semibold bg-emerald-50/50 px-3 py-2 rounded-xl border border-emerald-200/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="truncate">{doc.fileName ?? "Verified document"}</span>
          </div>
        ) : (
          <FileUpload
            onFileSelect={onUpload}
            currentFile={doc.fileName ? { name: doc.fileName, sizeKB: 120 } : null}
            onFileRemove={() => { /* keep as uploaded */ }}
          />
        )}

        {canVerify && doc.status === "uploaded" && (
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onVerify}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Verify
            </button>
            <button
              type="button"
              onClick={onReject}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}