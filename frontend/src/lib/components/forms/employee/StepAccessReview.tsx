import { Checkbox } from "@/lib/components/ui/Checkbox";
import type { Department, Designation } from "@/lib/api/settings";
import type { EmployeeDraft } from "./types";

export interface StepAccessReviewProps {
  draft: EmployeeDraft;
  onChange: (patch: Partial<EmployeeDraft>) => void;
  departments: Department[];
  designations: Designation[];
  onJumpTo: (step: number) => void;
}

export function StepAccessReview({ draft, onChange, departments, designations, onJumpTo }: StepAccessReviewProps) {
  const dept = departments.find((d) => d.id === draft.departmentId)?.name ?? "—";
  const desig = designations.find((d) => d.id === draft.designationId)?.name ?? "—";
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <section>
        <h3 className="text-[13px] font-semibold text-[#0A0A0A] mb-3">Access</h3>
        <div className="space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B]">Work email</p>
            <p className="text-[14px]">{draft.workEmail ?? "—"}</p>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#0A0A0A]">Role</label>
            <select value={draft.role ?? "employee"} onChange={(e) => onChange({ role: e.target.value as EmployeeDraft["role"] })} className="w-full h-11 px-3 rounded-md border border-[#E5E5E3] bg-white text-[14px]">
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="hr_admin">HR Admin</option>
            </select>
          </div>
          <Checkbox label="Send login credentials to work email" checked={!!draft.sendCredentials} onChange={(e) => onChange({ sendCredentials: e.target.checked })} />
        </div>
      </section>
      <section className="rounded-md border border-[#E5E5E3] bg-[#FAFAF8] p-4">
        <h3 className="text-[13px] font-semibold text-[#0A0A0A] mb-3">Review</h3>
        <dl className="space-y-2 text-[13px]">
          <Row label="Name" value={`${draft.firstName ?? ""} ${draft.lastName ?? ""}`.trim() || "—"} onEdit={() => onJumpTo(0)} />
          <Row label="Employee code" value={draft.employeeCode ?? "—"} />
          <Row label="Department" value={dept} onEdit={() => onJumpTo(1)} />
          <Row label="Designation" value={desig} onEdit={() => onJumpTo(1)} />
          <Row label="Employment type" value={draft.employmentType ?? "—"} onEdit={() => onJumpTo(1)} />
          <Row label="Joining date" value={draft.dateOfJoining ?? "—"} />
          <Row label="CTC" value={draft.ctcAnnual ? `₹${draft.ctcAnnual.toLocaleString("en-IN")} / year` : "—"} onEdit={() => onJumpTo(2)} />
          <Row label="Documents" value={`${draft.documents?.length ?? 0} uploaded`} onEdit={() => onJumpTo(3)} />
        </dl>
      </section>
    </div>
  );
}

function Row({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#E5E5E3] last:border-0 pb-1.5">
      <span className="text-[#6B6B6B]">{label}</span>
      <span className="text-[#0A0A0A] flex items-center gap-2">
        {value}
        {onEdit && <button type="button" onClick={onEdit} className="text-[11px] text-[var(--tenant-primary)] hover:underline">Edit</button>}
      </span>
    </div>
  );
}