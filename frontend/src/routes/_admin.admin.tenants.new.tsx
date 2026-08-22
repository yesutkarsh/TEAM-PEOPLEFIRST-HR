import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Breadcrumb, Card, Input, Select, Textarea, Button } from "@/lib/components/ui";
import { showToast } from "@/lib/components/ui/Toast";
import { adminApi } from "@/lib/api/admin";
import type { TenantPlan } from "@/lib/types/admin";

export const Route = createFileRoute("/_admin/admin/tenants/new")({
  component: NewTenantPage,
  head: () => ({ meta: [{ title: "New tenant — HRMS Admin" }] }),
});

const INDUSTRIES = ["Software & Technology","Financial Services","Healthcare","Retail & E-commerce","Manufacturing","Education","Professional Services","Media & Entertainment","Other"].map(v => ({ value: v, label: v }));
const SIZES = [
  { value: "1-50", label: "1–50 employees" },
  { value: "51-200", label: "51–200 employees" },
  { value: "201-500", label: "201–500 employees" },
  { value: "501-2000", label: "501–2,000 employees" },
  { value: "2000+", label: "2,000+ employees" },
];
const COUNTRIES = ["United States","United Kingdom","Canada","Australia","Germany","France","India","Singapore","United Arab Emirates","Other"].map(v => ({ value: v, label: v }));
const PLANS: { value: TenantPlan; label: string }[] = [
  { value: "Trial", label: "Trial" },
  { value: "Starter", label: "Starter" },
  { value: "Growth", label: "Growth" },
  { value: "Enterprise", label: "Enterprise" },
];

function NewTenantPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: "", domain: "", industry: "", size: "", country: "",
    hrContactName: "", hrContactEmail: "",
    plan: "Trial" as TenantPlan, trialEndsAt: "", internalNotes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.companyName.trim().length < 2) errs.companyName = "Required";
    if (!form.industry) errs.industry = "Required";
    if (!form.size) errs.size = "Required";
    if (!form.country) errs.country = "Required";
    if (form.hrContactName.trim().length < 2) errs.hrContactName = "Required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.hrContactEmail)) errs.hrContactEmail = "Invalid email";
    if (form.plan === "Trial" && !form.trialEndsAt) errs.trialEndsAt = "Required for trial plans";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    const res = await adminApi.createTenantManual(form);
    setSaving(false);
    if (res.error || !res.data) { showToast(res.error?.message ?? "Create failed", "error"); return; }
    showToast(`Tenant created. Invite email sent to ${form.hrContactEmail}.`, "success");
    navigate({ to: "/admin/tenants/$tenantId", params: { tenantId: res.data.id } });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Breadcrumb items={[{ label: "Platform", to: "/admin/dashboard" }, { label: "Tenants", to: "/admin/tenants" }, { label: "New" }]} />
      <h1 className="text-[28px] font-bold tracking-[-0.01em]">Create tenant manually</h1>
      <form onSubmit={submit} noValidate>
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <Input label="Company name" value={form.companyName} onChange={(e) => set({ companyName: e.target.value })} error={errors.companyName} autoFocus />
            <Input label="Domain" placeholder="https://acme.com" value={form.domain} onChange={(e) => set({ domain: e.target.value })} />
            <Select label="Industry" placeholder="Select industry" options={INDUSTRIES} value={form.industry} onChange={(e) => set({ industry: e.target.value })} error={errors.industry} />
            <Select label="Size" placeholder="Select size" options={SIZES} value={form.size} onChange={(e) => set({ size: e.target.value })} error={errors.size} />
            <Select label="Country" placeholder="Select country" options={COUNTRIES} value={form.country} onChange={(e) => set({ country: e.target.value })} error={errors.country} />
            <Select label="Plan" options={PLANS} value={form.plan} onChange={(e) => set({ plan: e.target.value as TenantPlan })} />
            <Input label="HR contact name" value={form.hrContactName} onChange={(e) => set({ hrContactName: e.target.value })} error={errors.hrContactName} />
            <Input label="HR contact email" type="email" value={form.hrContactEmail} onChange={(e) => set({ hrContactEmail: e.target.value })} error={errors.hrContactEmail} />
            {form.plan === "Trial" && (
              <Input label="Trial end date" type="text" placeholder="YYYY-MM-DD" value={form.trialEndsAt} onChange={(e) => set({ trialEndsAt: e.target.value })} error={errors.trialEndsAt} />
            )}
          </div>
          <div className="mt-5">
            <Textarea label="Internal notes" hint="Not visible to the tenant." rows={3} value={form.internalNotes} onChange={(e) => set({ internalNotes: e.target.value })} />
          </div>
        </Card>
        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate({ to: "/admin/tenants" })} type="button">Cancel</Button>
          <Button type="submit" loading={saving}>Create tenant</Button>
        </div>
      </form>
    </div>
  );
}
