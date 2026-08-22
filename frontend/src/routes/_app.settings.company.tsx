/** Theme editor for post-onboarding brand updates. */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button, Card, Badge } from "@/lib/components/ui";
import { ColorPicker } from "@/lib/components/forms";
import { ThemePreview } from "@/lib/components/onboarding";
import { PageHeader } from "@/lib/components/layout";
import { tenantStore } from "@/lib/store/tenant";
import { tenantsApi } from "@/lib/api/tenants";
import { applyTenantTheme, buildTheme, contrastRatio, computeTextColor } from "@/lib/themes/utils";
import { DEFAULT_THEME } from "@/lib/themes/defaults";
import { uiStore } from "@/lib/store/ui";

export const Route = createFileRoute("/_app/settings/company")({
  component: CompanySettings,
});

function CompanySettings() {
  const tenant = tenantStore.useSelector((s) => s.tenant);
  const theme = tenantStore.useSelector((s) => s.theme);
  const [primary, setPrimary] = useState(theme.primaryColor);
  const [secondary, setSecondary] = useState(theme.secondaryColor);
  const [accent, setAccent] = useState(theme.accentColor);
  const [saving, setSaving] = useState(false);

  if (!tenant) return null;

  const onPrimary = computeTextColor(primary);
  const warn = contrastRatio(primary, onPrimary) < 4.5;

  const save = async () => {
    setSaving(true);
    const next = buildTheme({ primaryColor: primary, secondaryColor: secondary, accentColor: accent });
    const res = await tenantsApi.updateTheme(tenant.id, next);
    setSaving(false);
    if (res.error || !res.data) {
      uiStore.pushToast({ message: res.error?.message ?? "Save failed", variant: "error" });
      return;
    }
    tenantStore.updateTheme(next);
    applyTenantTheme(next);
    uiStore.pushToast({ message: "Brand updated", variant: "success" });
  };

  const reset = async () => {
    const res = await tenantsApi.updateTheme(tenant.id, DEFAULT_THEME);
    if (res.data) {
      setPrimary(DEFAULT_THEME.primaryColor);
      setSecondary(DEFAULT_THEME.secondaryColor);
      setAccent(DEFAULT_THEME.accentColor);
      tenantStore.updateTheme(DEFAULT_THEME);
      applyTenantTheme(DEFAULT_THEME);
      uiStore.pushToast({ message: "Reset to defaults", variant: "info" });
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="Company brand" description="Update how your workspace looks for everyone on your team." />
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-10">
        <Card>
          <div className="space-y-6">
            <ColorPicker label="Primary color" value={primary} onChange={setPrimary} />
            <ColorPicker label="Secondary color" value={secondary} onChange={setSecondary} />
            <ColorPicker label="Accent color" value={accent} onChange={setAccent} />
            {warn && <Badge variant="warning">Contrast warning — text on primary may be hard to read</Badge>}
            <div className="flex items-center justify-between pt-4 border-t border-[#E5E5E3]">
              <button type="button" onClick={reset} className="text-[13px] text-[#6B6B6B] hover:text-[#0A0A0A] underline underline-offset-4">
                Reset to defaults
              </button>
              <Button onClick={save} loading={saving} variant="tenant">Save changes</Button>
            </div>
          </div>
        </Card>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B] mb-3">Live preview</p>
          <ThemePreview
            primary={primary}
            secondary={secondary}
            accent={accent}
            companyName={tenant.settings.companyName}
          />
        </div>
      </div>
    </div>
  );
}