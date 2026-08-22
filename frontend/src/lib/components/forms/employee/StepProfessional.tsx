import { Input } from "@/lib/components/ui/Input";
import { DatePicker } from "@/lib/components/ui/DatePicker";
import type { Department, Designation } from "@/lib/api/settings";
import type { Employee } from "@/lib/types/employee";
import type { EmployeeDraft } from "./types";

export interface StepProfessionalProps {
  draft: EmployeeDraft;
  errors: Record<string, string>;
  onChange: (patch: Partial<EmployeeDraft>) => void;
  employees: Employee[];
  departments: Department[];
  designations: Designation[];
  generatedCode: string;
  generatedWorkEmail: string;
}

export function StepProfessional({ draft, errors, onChange, employees, departments, designations, generatedCode, generatedWorkEmail }: StepProfessionalProps) {
  const filteredDesigs = draft.departmentId ? designations.filter((d) => d.departmentIds.includes(draft.departmentId!)) : designations;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Employee code" value={draft.employeeCode ?? generatedCode} onChange={(e) => onChange({ employeeCode: e.target.value })} />
        <Input label="Work email" value={draft.workEmail ?? generatedWorkEmail} onChange={(e) => onChange({ workEmail: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[#0A0A0A]">Department <span className="text-[#DC2626]">*</span></label>
          <select value={draft.departmentId ?? ""} onChange={(e) => onChange({ departmentId: e.target.value, designationId: undefined })} className="w-full h-11 px-3 rounded-md border border-[#E5E5E3] bg-white text-[14px]">
            <option value="">Select department</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {errors.departmentId && <p className="mt-1.5 text-[13px] text-[#DC2626]">{errors.departmentId}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[#0A0A0A]">Designation <span className="text-[#DC2626]">*</span></label>
          <select value={draft.designationId ?? ""} onChange={(e) => { const dz = filteredDesigs.find((d) => d.id === e.target.value); onChange({ designationId: e.target.value, grade: dz?.grade }); }} className="w-full h-11 px-3 rounded-md border border-[#E5E5E3] bg-white text-[14px]">
            <option value="">Select designation</option>
            {filteredDesigs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {errors.designationId && <p className="mt-1.5 text-[13px] text-[#DC2626]">{errors.designationId}</p>}
        </div>
        <Input label="Grade / Band" value={draft.grade ?? ""} onChange={(e) => onChange({ grade: e.target.value })} />
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[#0A0A0A]">Reporting manager</label>
          <select value={draft.reportingManagerId ?? ""} onChange={(e) => onChange({ reportingManagerId: e.target.value || undefined })} className="w-full h-11 px-3 rounded-md border border-[#E5E5E3] bg-white text-[14px]">
            <option value="">None</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[#0A0A0A]">Employment type <span className="text-[#DC2626]">*</span></label>
          <select value={draft.employmentType ?? "full_time"} onChange={(e) => onChange({ employmentType: e.target.value as Employee["employmentType"] })} className="w-full h-11 px-3 rounded-md border border-[#E5E5E3] bg-white text-[14px]">
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="intern">Intern</option>
          </select>
        </div>
        <Input label="Work location" value={draft.workLocation ?? ""} onChange={(e) => onChange({ workLocation: e.target.value })} />
        <DatePicker label="Date of joining" required value={draft.dateOfJoining ?? ""} onChange={(v) => onChange({ dateOfJoining: v, probationEndDate: new Date(new Date(v).getTime() + 90 * 86400000).toISOString().slice(0, 10) })} error={errors.dateOfJoining} />
        <DatePicker label="Probation end date" value={draft.probationEndDate ?? ""} onChange={(v) => onChange({ probationEndDate: v })} />
      </div>
    </div>
  );
}

export function validateProfessional(d: EmployeeDraft): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.departmentId) e.departmentId = "Required";
  if (!d.designationId) e.designationId = "Required";
  if (!d.dateOfJoining) e.dateOfJoining = "Required";
  return e;
}