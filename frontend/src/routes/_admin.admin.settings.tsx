import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Breadcrumb, Button, Card, ConfirmDialog, Input, Select } from "@/lib/components/ui";
import { showToast } from "@/lib/components/ui/Toast";
import { adminApi } from "@/lib/api/admin";
import type { PlatformSettings, TenantPlan } from "@/lib/types/admin";

export const Route = createFileRoute("/_admin/admin/settings")({
  component: AdminSettings,
  head: () => ({ meta: [{ title: "Platform settings — HRMS Admin" }] }),
});

const PLANS: { value: TenantPlan; label: string }[] = [
  { value: "Trial", label: "Trial" },
  { value: "Starter", label: "Starter" },
  { value: "Growth", label: "Growth" },
  { value: "Enterprise", label: "Enterprise" },
];

function AdminSettings() {
  const [s, setS] = useState<PlatformSettings | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => { void adminApi.getSettings().then((r) => r.data && setS(r.data)); }, []);
  if (!s) return null;

  const save = async () => {
    const res = await adminApi.saveSettings(s);
    if (res.error) { showToast(res.error.message, "error"); return; }
    showToast("Settings saved", "success");
  };

  const clearTest = async () => {
    const r = await adminApi.clearTestTenants();
    showToast(`${r.data ?? 0} test tenants deleted`, "success");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Breadcrumb items={[{ label: "Platform", to: "/admin/dashboard" }, { label: "Settings" }]} />
      <h1 className="text-[28px] font-bold tracking-[-0.01em]">Platform settings</h1>

      <Card className="space-y-5">
        <h2 className="text-[15px] font-semibold">Branding</h2>
        <Input label="Platform name" value={s.platformName} onChange={(e) => setS({ ...s, platformName: e.target.value })} />
        <Input label="Support email" type="email" value={s.supportEmail} onChange={(e) => setS({ ...s, supportEmail: e.target.value })} />
      </Card>

      <Card className="space-y-5">
        <h2 className="text-[15px] font-semibold">Onboarding defaults</h2>
        <Input label="Default trial period (days)" type="number" value={String(s.defaultTrialDays)} onChange={(e) => setS({ ...s, defaultTrialDays: Number(e.target.value) || 0 })} />
        <Select label="Default plan for self-serve" options={PLANS} value={s.defaultPlan} onChange={(e) => setS({ ...s, defaultPlan: e.target.value as TenantPlan })} />
      </Card>

      <div className="flex justify-end">
        <Button onClick={save}>Save settings</Button>
      </div>

      <Card className="border-[#FECACA]">
        <h2 className="text-[15px] font-semibold text-[#991B1B]">Danger zone</h2>
        <p className="text-[13px] text-[#6B6B6B] mt-1 mb-4">Permanently delete all tenants marked as test.</p>
        <Button variant="danger" onClick={() => setConfirmClear(true)}>Clear all test tenants</Button>
      </Card>

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear all test tenants?"
        description="This deletes every tenant flagged as test. This cannot be undone."
        confirmLabel="Clear test tenants"
        variant="danger"
        onConfirm={clearTest}
      />
    </div>
  );
}
