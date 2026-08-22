import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Breadcrumb, StepForm, Alert } from "@/lib/components/ui";
import {
  EMPTY_DRAFT,
  StepAccessReview,
  StepCompensation,
  StepDocuments,
  StepPersonal,
  StepProfessional,
  validateCompensation,
  validateDocuments,
  validatePersonal,
  validateProfessional,
  type EmployeeDraft,
} from "@/lib/components/forms/employee";
import { createEmployee, nextEmployeeCode, listEmployees } from "@/lib/api/employees";
import { settingsApi, type Department, type Designation } from "@/lib/api/settings";
import { showToast } from "@/lib/components/ui/Toast";
import { tenantStore } from "@/lib/store/tenant";
import type { Employee } from "@/lib/types/employee";

export const Route = createFileRoute("/_app/employees/new")({
  component: NewEmployeePage,
  head: () => ({ meta: [{ title: "Add Employee — HRMS" }] }),
});

const DRAFT_KEY = "hrms.newEmployee.draft";
const STEP_KEY = "hrms.newEmployee.step";

const STEPS = [
  { id: "personal", label: "Personal info" },
  { id: "professional", label: "Professional info" },
  { id: "compensation", label: "Compensation" },
  { id: "documents", label: "Documents" },
  { id: "access", label: "Access & review" },
];

function NewEmployeePage() {
  const navigate = useNavigate();
  const tenant = tenantStore.useSelector((s) => s.tenant);
  const [draft, setDraft] = useState<EmployeeDraft>(EMPTY_DRAFT);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [generatedCode, setGeneratedCode] = useState("EMP-0001");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sd = window.sessionStorage.getItem(DRAFT_KEY);
    const ss = window.sessionStorage.getItem(STEP_KEY);
    if (sd) try { setDraft({ ...EMPTY_DRAFT, ...(JSON.parse(sd) as EmployeeDraft) }); } catch { /* */ }
    if (ss) setStep(Number(ss) || 0);
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    window.sessionStorage.setItem(STEP_KEY, String(step));
  }, [draft, step]);

  useEffect(() => {
    void Promise.all([settingsApi.listDepartments(), settingsApi.listDesignations(), listEmployees(), nextEmployeeCode()]).then(
      ([d, dz, em, code]) => {
        if (d.data) setDepartments(d.data);
        if (dz.data) setDesignations(dz.data);
        if (em.data) setEmployees(em.data);
        setGeneratedCode(code);
      },
    );
  }, []);

  const generatedWorkEmail = useMemo(() => {
    const domain = (tenant?.settings.domain ?? "company.com").replace(/^https?:\/\//, "");
    const slug = `${(draft.firstName ?? "").toLowerCase()}.${(draft.lastName ?? "").toLowerCase()}`.replace(/[^a-z.]/g, "");
    return slug ? `${slug}@${domain}` : "";
  }, [draft.firstName, draft.lastName, tenant]);

  const onChange = (patch: Partial<EmployeeDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const validateCurrent = (): Record<string, string> => {
    if (step === 0) return validatePersonal(draft);
    if (step === 1) return validateProfessional(draft);
    if (step === 2) return validateCompensation(draft);
    if (step === 3) return validateDocuments(draft);
    return {};
  };

  const onContinue = () => {
    const e = validateCurrent();
    setErrors(e);
    if (Object.keys(e).length === 0) setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const onSubmit = async () => {
    const e = validateCurrent();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSubmitting(true);
    setSubmitErr(null);
    const finalDraft = {
      ...draft,
      employeeCode: draft.employeeCode ?? generatedCode,
      workEmail: draft.workEmail ?? generatedWorkEmail,
    } as EmployeeDraft;
    const res = await createEmployee(finalDraft as Parameters<typeof createEmployee>[0]);
    setSubmitting(false);
    if (res.error || !res.data) {
      setSubmitErr(res.error?.message ?? "Failed to create employee");
      return;
    }
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(DRAFT_KEY);
      window.sessionStorage.removeItem(STEP_KEY);
    }
    showToast(`${res.data.firstName} ${res.data.lastName} added successfully.`, "success");
    navigate({ to: "/employees/$employeeId", params: { employeeId: res.data.id } });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumb items={[{ label: "Employees", to: "/employees" }, { label: "Add employee" }]} />
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">Add employee</h1>
        <p className="mt-1 text-[14px] text-[#6B6B6B]">Five guided steps. Progress is saved as you go.</p>
      </div>

      {submitErr && <Alert variant="error">{submitErr}</Alert>}

      <StepForm
        steps={STEPS}
        currentStep={step}
        onBack={() => setStep((s) => Math.max(0, s - 1))}
        onContinue={onContinue}
        onSubmit={onSubmit}
        submitLabel="Create employee →"
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
            generatedCode={generatedCode}
            generatedWorkEmail={generatedWorkEmail}
          />
        )}
        {step === 2 && <StepCompensation draft={draft} errors={errors} onChange={onChange} />}
        {step === 3 && <StepDocuments draft={draft} onChange={onChange} />}
        {step === 4 && (
          <StepAccessReview
            draft={draft}
            onChange={onChange}
            departments={departments}
            designations={designations}
            onJumpTo={setStep}
          />
        )}
      </StepForm>
    </div>
  );
}