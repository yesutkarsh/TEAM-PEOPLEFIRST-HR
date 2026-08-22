import { Input } from "@/lib/components/ui/Input";
import { DatePicker } from "@/lib/components/ui/DatePicker";
import { PhoneInput } from "@/lib/components/ui/PhoneInput";
import { Checkbox } from "@/lib/components/ui/Checkbox";
import type { EmployeeDraft } from "./types";

export interface StepPersonalProps {
  draft: EmployeeDraft;
  errors: Record<string, string>;
  onChange: (patch: Partial<EmployeeDraft>) => void;
}

export function StepPersonal({ draft, errors, onChange }: StepPersonalProps) {
  const ca = draft.currentAddress!;
  const pa = draft.permanentAddress;
  const set = (k: keyof EmployeeDraft, v: unknown) => onChange({ [k]: v } as Partial<EmployeeDraft>);
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-[13px] font-semibold text-[#0A0A0A] mb-3">Personal details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="First name" value={draft.firstName ?? ""} onChange={(e) => set("firstName", e.target.value)} error={errors.firstName} />
          <Input label="Middle name" value={draft.middleName ?? ""} onChange={(e) => set("middleName", e.target.value)} />
          <Input label="Last name" value={draft.lastName ?? ""} onChange={(e) => set("lastName", e.target.value)} error={errors.lastName} />
          <Input type="email" label="Personal email" value={draft.personalEmail ?? ""} onChange={(e) => set("personalEmail", e.target.value)} error={errors.personalEmail} />
          <PhoneInput label="Phone number" value={draft.phone ?? ""} onChange={(v) => set("phone", v)} error={errors.phone} />
          <DatePicker label="Date of birth" value={draft.dateOfBirth ?? ""} onChange={(v) => set("dateOfBirth", v)} maxDate={new Date(Date.now() - 18 * 365 * 86400000).toISOString().slice(0, 10)} />
          <Input label="Blood group" value={draft.bloodGroup ?? ""} onChange={(e) => set("bloodGroup", e.target.value)} />
          <Input label="Nationality" value={draft.nationality ?? ""} onChange={(e) => set("nationality", e.target.value)} />
        </div>
      </section>

      <section>
        <h3 className="text-[13px] font-semibold text-[#0A0A0A] mb-3">Emergency contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Name" value={draft.emergencyContact?.name ?? ""} onChange={(e) => set("emergencyContact", { ...draft.emergencyContact!, name: e.target.value })} />
          <Input label="Relationship" value={draft.emergencyContact?.relationship ?? ""} onChange={(e) => set("emergencyContact", { ...draft.emergencyContact!, relationship: e.target.value })} />
          <PhoneInput label="Phone" value={draft.emergencyContact?.phone ?? ""} onChange={(v) => set("emergencyContact", { ...draft.emergencyContact!, phone: v })} />
        </div>
      </section>

      <section>
        <h3 className="text-[13px] font-semibold text-[#0A0A0A] mb-3">Current address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Address line 1" value={ca.line1} onChange={(e) => set("currentAddress", { ...ca, line1: e.target.value })} />
          <Input label="Address line 2" value={ca.line2 ?? ""} onChange={(e) => set("currentAddress", { ...ca, line2: e.target.value })} />
          <Input label="City" value={ca.city} onChange={(e) => set("currentAddress", { ...ca, city: e.target.value })} />
          <Input label="State" value={ca.state} onChange={(e) => set("currentAddress", { ...ca, state: e.target.value })} />
          <Input label="Pincode" value={ca.pincode} onChange={(e) => set("currentAddress", { ...ca, pincode: e.target.value })} />
          <Input label="Country" value={ca.country} onChange={(e) => set("currentAddress", { ...ca, country: e.target.value })} />
        </div>
        <div className="mt-3">
          <Checkbox
            label="Permanent address is same as current"
            checked={!!draft.sameAddress}
            onChange={(e) => set("sameAddress", e.target.checked)}
          />
        </div>
        {!draft.sameAddress && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Input label="Permanent line 1" value={pa?.line1 ?? ""} onChange={(e) => set("permanentAddress", { ...(pa ?? { line1: "", city: "", state: "", pincode: "", country: "India" }), line1: e.target.value })} />
            <Input label="Permanent city" value={pa?.city ?? ""} onChange={(e) => set("permanentAddress", { ...(pa ?? { line1: "", city: "", state: "", pincode: "", country: "India" }), city: e.target.value })} />
          </div>
        )}
      </section>
    </div>
  );
}

export function validatePersonal(d: EmployeeDraft): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.firstName?.trim()) e.firstName = "Required";
  if (!d.lastName?.trim()) e.lastName = "Required";
  if (!d.personalEmail?.includes("@")) e.personalEmail = "Valid email required";
  if (!d.phone || d.phone.replace(/\D/g, "").length < 7) e.phone = "Valid phone required";
  return e;
}