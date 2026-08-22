/** List of all employee documents with verification controls. */
import { useState } from "react";
import { FolderCheck, ShieldAlert } from "lucide-react";
import type { Employee, EmployeeDocument } from "@/lib/types/employee";
import { DocumentItem } from "./DocumentItem";
import { SlideOver } from "@/lib/components/ui/SlideOver";
import { Button, Textarea } from "@/lib/components/ui";

export interface DocumentVaultProps {
  employee: Employee;
  canVerify?: boolean;
  onUpdateDoc: (docId: string, patch: Partial<EmployeeDocument>) => Promise<void> | void;
}

export function DocumentVault({ employee, canVerify, onUpdateDoc }: DocumentVaultProps) {
  const [rejectFor, setRejectFor] = useState<EmployeeDocument | null>(null);
  const [note, setNote] = useState("");

  const upload = async (doc: EmployeeDocument, f: File) => {
    await onUpdateDoc(doc.id, {
      status: "uploaded",
      fileName: f.name,
      uploadedAt: new Date().toISOString(),
      rejectedNote: undefined,
    });
  };

  const verifiedCount = employee.documents.filter((d) => d.status === "verified").length;
  const totalCount = employee.documents.length;

  return (
    <div className="space-y-5">
      {/* Document Vault Summary Banner */}
      <div className="rounded-2xl border border-[#E5E5E3] bg-[#FAFAF9] p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white border border-[#E5E5E3] text-[#0A0A0A] shadow-2xs">
            <FolderCheck className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-[#0A0A0A] tracking-tight">Document Vault</h3>
            <p className="text-[12px] text-[#8E8E8E]">Official compliance & identity documents</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white border border-[#E5E5E3] text-[#0A0A0A] shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="tabular-nums">{verifiedCount} / {totalCount}</span> Verified
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {employee.documents.map((d) => (
          <DocumentItem
            key={d.id}
            doc={d}
            canVerify={canVerify}
            onUpload={(f) => upload(d, f)}
            onVerify={() => onUpdateDoc(d.id, { status: "verified", verifiedAt: new Date().toISOString() })}
            onReject={() => {
              setRejectFor(d);
              setNote("");
            }}
          />
        ))}
      </div>

      <SlideOver
        open={!!rejectFor}
        onClose={() => setRejectFor(null)}
        title={`Reject ${rejectFor?.label ?? "document"}`}
        description="The employee will see this note and be asked to re-upload."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectFor(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (rejectFor) {
                  await onUpdateDoc(rejectFor.id, { status: "rejected", rejectedNote: note || "Document rejected." });
                  setRejectFor(null);
                }
              }}
            >
              Reject document
            </Button>
          </>
        }
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/60 text-xs text-rose-800 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>This action will notify the employee and prompt them to re-upload a compliant copy.</span>
          </div>
          <Textarea label="Rejection reason" value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="e.g. Document copy is blurry or expired." />
        </div>
      </SlideOver>
    </div>
  );
}