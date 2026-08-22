import { useEffect, useState } from "react";
import { Button, CurrencyInput, Input, InfoTooltip, RadioGroup, Select, SlideOver, Textarea, Toggle } from "@/lib/components/ui";
import { payrollApi } from "@/lib/api/payroll";
import type { CalculationMethod, ComponentType, SalaryComponent, StatutoryType } from "@/lib/types/payroll";

const STATUTORY_RULES: Record<StatutoryType, string> = {
  pf_employee: "PF Employee = 12% of Basic, capped at ₹1,800/month.",
  pf_employer: "PF Employer = 12% of Basic, capped at ₹1,800/month.",
  esi_employee: "ESI Employee = 0.75% of gross, only when gross ≤ ₹21,000/month.",
  esi_employer: "ESI Employer = 3.25% of gross, only when gross ≤ ₹21,000/month.",
  professional_tax: "Professional Tax follows state slabs. Karnataka default: ₹200/month above ₹15,000 gross.",
  tds: "TDS is entered manually per employee in MVP1.",
};

export interface SalaryComponentFormProps {
  open: boolean;
  onClose: () => void;
  component?: SalaryComponent | null;
  usedInStructure?: boolean;
  onSaved: () => void;
}

export function SalaryComponentForm({ open, onClose, component, usedInStructure, onSaved }: SalaryComponentFormProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<ComponentType>("earning");
  const [method, setMethod] = useState<CalculationMethod>("fixed");
  const [value, setValue] = useState<number | null>(0);
  const [statutoryType, setStatutoryType] = useState<StatutoryType>("pf_employee");
  const [taxable, setTaxable] = useState(true);
  const [active, setActive] = useState(true);
  const [description, setDescription] = useState("");
  const [codeError, setCodeError] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(component?.name ?? "");
    setCode(component?.code ?? "");
    setType(component?.type ?? "earning");
    setMethod(component?.calculationMethod ?? "fixed");
    setValue(component?.value ?? 0);
    setStatutoryType(component?.statutoryType ?? "pf_employee");
    setTaxable(component?.taxable ?? true);
    setActive(component?.isActive ?? true);
    setDescription(component?.description ?? "");
    setCodeError(undefined);
    setError(undefined);
  }, [open, component]);

  const checkCode = async () => {
    if (!code) return;
    const unique = await payrollApi.isCodeUnique(code, component?.id);
    setCodeError(unique ? undefined : "This code is already in use.");
  };

  const submit = async () => {
    if (!name.trim() || !code.trim()) { setError("Name and code are required."); return; }
    if (code.trim().length < 2 || code.trim().length > 8) { setError("Code must be 2–8 characters."); return; }
    setSaving(true);
    const res = await payrollApi.saveComponent({
      id: component?.id,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      type,
      calculationMethod: method,
      value: method === "statutory" || method === "balance" ? undefined : value ?? 0,
      statutoryType: method === "statutory" ? statutoryType : undefined,
      taxable,
      isActive: active,
      description: description.trim() || undefined,
    });
    setSaving(false);
    if (res.error) { setError(res.error.message); return; }
    onSaved();
    onClose();
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      width="md"
      title={component ? "Edit component" : "Add component"}
      description="Salary components are the building blocks of every structure."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={saving}>{component ? "Save changes" : "Add component"}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-[13px] text-[#DC2626]">{error}</p>}
        <Input label="Component name" value={name} onChange={(e) => { setName(e.target.value); if (!component) setCode(e.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 6).toUpperCase()); }} />
        <Input label="Code" value={code} onBlur={checkCode} error={codeError} hint="2–8 characters, unique." onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <Select
          label="Type"
          value={type}
          disabled={usedInStructure}
          hint={usedInStructure ? "Locked — this component is already used in a salary structure." : undefined}
          onChange={(e) => setType(e.target.value as ComponentType)}
          options={[
            { value: "earning", label: "Earning" },
            { value: "deduction", label: "Deduction" },
            { value: "employer_contribution", label: "Employer contribution" },
          ]}
        />
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-[#0A0A0A]">Calculation method</p>
          <RadioGroup
            name="calc-method"
            value={method}
            onChange={(v) => setMethod(v as CalculationMethod)}
            options={[
              { value: "fixed", label: "Fixed amount" },
              { value: "percentage_of_basic", label: "% of Basic" },
              { value: "percentage_of_ctc", label: "% of CTC" },
              { value: "statutory", label: "Statutory" },
              { value: "slab", label: "Slab based (Professional Tax)" },
              { value: "balance", label: "Balance of CTC" },
            ]}
          />
        </div>
        {method === "fixed" && <CurrencyInput label="Monthly amount" value={value} onChange={setValue} min={0} />}
        {(method === "percentage_of_basic" || method === "percentage_of_ctc") && (
          <div className="flex items-end gap-2">
            <Input
              label="Percentage"
              type="number"
              value={String(value ?? 0)}
              onChange={(e) => setValue(Number(e.target.value))}
            />
            <InfoTooltip content={method === "percentage_of_basic" ? "Calculated as this % of the BASIC component in the same structure." : "Calculated as this % of monthly CTC."} />
          </div>
        )}
        {method === "statutory" && (
          <>
            <Select
              label="Statutory type"
              value={statutoryType}
              onChange={(e) => setStatutoryType(e.target.value as StatutoryType)}
              options={[
                { value: "pf_employee", label: "PF Employee" },
                { value: "pf_employer", label: "PF Employer" },
                { value: "esi_employee", label: "ESI Employee" },
                { value: "esi_employer", label: "ESI Employer" },
                { value: "professional_tax", label: "Professional Tax" },
                { value: "tds", label: "TDS" },
              ]}
            />
            <p className="text-[13px] text-[#6B6B6B]">{STATUTORY_RULES[statutoryType]}</p>
          </>
        )}
        {method === "slab" && (
          <p className="text-[13px] text-[#6B6B6B]">Uses the default Karnataka slab: ₹0 up to ₹15,000 gross, ₹200 above.</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium inline-flex items-center gap-1.5">
            Taxable income component
            <InfoTooltip content="Taxable components are included in income tax calculations." />
          </span>
          <Toggle checked={taxable} onChange={setTaxable} label="Taxable" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium">Active</span>
          <Toggle checked={active} onChange={setActive} label="Active" />
        </div>
        <Textarea label="Description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
    </SlideOver>
  );
}