import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Breadcrumb, StepForm, Alert, Spinner } from "@/lib/components/ui";
import {
  StepAccessReview,
  StepCompensation,
  StepDocuments,
  StepPersonal,
  StepProfessional,
  validateCompensation,
  validatePersonal,
  validateProfessional,
  type EmployeeDraft,
} from "@/lib/components/forms/employee";
import { getEmployee, listEmployees, updateEmployee } from "@/lib/api/employees";
import { settingsApi, type Department, type Designation } from "@/lib/api/settings";
import { showToast } from "@/lib/components/ui/Toast";
import type { Employee } from "@/lib/types/employee";

export const Route = createFileRoute("/_app/employees/$employeeId/edit")({
  component: EditEmployeePage,
  head: () => ({ meta: [{ title: "Edit Employee — HRMS" }] }),
});

const STEPS = [
  { id: "personal", label: "Personal info" },
  { id: "professional", label: "Professional info" },
  { id: "compensation", label: "Compensation" },
  { id: "documents", label: "Documents" },
  { id: "access", label: "Access & review" },
];

function EditEmployeePage() {
  const { employeeId } = useParams({ from: "/_app/employees/$employeeId/edit" });
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [draft, setDraft] = useState<EmployeeDraft | null>(null);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    void Promise.all([getEmployee(employeeId), settingsApi.listDepartments(), settingsApi.listDesignations(), listEmployees()]).then(
      ([r, d, dz, em]) => {
        if (r.data) {
          setEmployee(r.data);
          setDraft({ ...r.data, bankAccountConfirm: r.data.bankAccountNumber });
        }
        if (d.data) setDepartments(d.data);
        if (dz.data) setDesignations(dz.data);
        if (em.data) setEmployees(em.data.filter((e) => e.id !== employeeId));
      },
    );
  }, [employeeId]);

  if (!employee || !draft) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  const onChange = (patch: Partial<EmployeeDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const onSubmit = async () => {
    const e = step === 0 ? validatePersonal(draft) : step === 1 ? validateProfessional(draft) : step === 2 ? validateCompensation(draft) : {};
    setErrors(e);
    if (Object.keys(e).length) return;
    setSubmitting(true);
    setErr(null);
    const { bankAccountConfirm, sendCredentials, ...rest } = draft;
    void bankAccountConfirm; void sendCredentials;
    const r = await updateEmployee(employee.id, rest, "HR Admin", "Profile edited from full edit page.");
    setSubmitting(false);
    if (r.error || !r.data) { setErr(r.error?.message ?? "Failed to save"); return; }
    showToast("Profile updated.", "success");
    navigate({ to: "/employees/$employeeId", params: { employeeId: employee.id } });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumb items={[{ label: "Employees", to: "/employees" }, { label: `${employee.firstName} ${employee.lastName}`, to: `/employees/${employee.id}` }, { label: "Edit" }]} />
      <h1 className="text-[28px] font-bold tracking-[-0.02em]">Edit {employee.firstName} {employee.lastName}</h1>
      {err && <Alert variant="error">{err}</Alert>}
      <div className="flex gap-2 flex-wrap mb-2">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(i)}
            className={"text-[12px] px-3 py-1 rounded-full border " + (i === step ? "bg-[#0A0A0A] text-white border-[#0A0A0A]" : "border-[#E5E5E3] text-[#6B6B6B] hover:bg-[#F2F2F0]")}
          >
            {s.label}
          </button>
        ))}
      </div>
      <StepForm
        steps={STEPS}
        currentStep={step}
        onBack={() => setStep((s) => Math.max(0, s - 1))}
        onContinue={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
        onSubmit={onSubmit}
        submitLabel="Save changes →"
        isSubmitting={submitting}
      >
        {step === 0 && <StepPersonal draft={draft} errors={errors} onChange={onChange} />}
        {step === 1 && (
          <StepProfessional
            draft={draft}
            errors={errors}
            onChange={onChange}
            employees={employees}
            departments={departments}
            designations={designations}
            generatedCode={draft.employeeCode ?? ""}
            generatedWorkEmail={draft.workEmail ?? ""}
          />
        )}
        {step === 2 && <StepCompensation draft={draft} errors={errors} onChange={onChange} />}
        {step === 3 && <StepDocuments draft={draft} onChange={onChange} />}
        {step === 4 && (
          <StepAccessReview draft={draft} onChange={onChange} departments={departments} designations={designations} onJumpTo={setStep} />
        )}
      </StepForm>
    </div>
  );
}