import { Input } from "@/lib/components/ui/Input";
import type { EmployeeDraft } from "./types";

export interface StepCompensationProps {
  draft: EmployeeDraft;
  errors: Record<string, string>;
  onChange: (patch: Partial<EmployeeDraft>) => void;
}

function maskAadhaar(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 12);
  return digits.replace(/(\d{4})(\d{4})(\d{0,4})/, (_m, a, b, c) => [a, b, c].filter(Boolean).join(" "));
}

export function StepCompensation({ draft, errors, onChange }: StepCompensationProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Annual CTC (₹)"
          type="number"
          value={draft.ctcAnnual ? String(draft.ctcAnnual) : ""}
          onChange={(e) => onChange({ ctcAnnual: e.target.value ? Number(e.target.value) : undefined })}
        />
        <Input label="Payment mode" value="Bank transfer" disabled />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Bank name" value={draft.bankName ?? ""} onChange={(e) => onChange({ bankName: e.target.value })} error={errors.bankName} />
        <Input label="IFSC code" value={draft.bankIfsc ?? ""} onChange={(e) => onChange({ bankIfsc: e.target.value.toUpperCase() })} error={errors.bankIfsc} />
        <Input label="Bank account number" value={draft.bankAccountNumber ?? ""} onChange={(e) => onChange({ bankAccountNumber: e.target.value })} error={errors.bankAccountNumber} />
        <Input label="Confirm account number" value={draft.bankAccountConfirm ?? ""} onChange={(e) => onChange({ bankAccountConfirm: e.target.value })} error={errors.bankAccountConfirm} />
        <Input label="PAN number" value={draft.panNumber ?? ""} onChange={(e) => onChange({ panNumber: e.target.value.toUpperCase() })} error={errors.panNumber} />
        <Input label="Aadhaar number" value={draft.aadhaarNumber ?? ""} onChange={(e) => onChange({ aadhaarNumber: maskAadhaar(e.target.value) })} />
      </div>
      <p className="text-[12px] text-[#6B6B6B] bg-[#FAFAF8] border border-[#E5E5E3] rounded-sm px-3 py-2">
        This information is used for payroll processing. It is encrypted and only accessible to authorised HR and Finance personnel.
      </p>
    </div>
  );
}

export function validateCompensation(d: EmployeeDraft): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.bankName) e.bankName = "Required";
  if (!d.bankIfsc) e.bankIfsc = "Required";
  if (!d.bankAccountNumber) e.bankAccountNumber = "Required";
  if (d.bankAccountConfirm !== d.bankAccountNumber) e.bankAccountConfirm = "Does not match";
  if (d.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(d.panNumber)) e.panNumber = "Format: ABCDE1234F";
  return e;
}