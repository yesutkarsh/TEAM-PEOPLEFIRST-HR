/** Onboarding Step 4: review + launch. */
import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { StepIndicator, StepCard, ThemePreview } from "@/lib/components/onboarding";
import { Button, Checkbox, Card, Alert } from "@/lib/components/ui";
import { onboardingStore } from "@/lib/store/onboarding";
import { tenantsApi } from "@/lib/api/tenants";
import { authApi } from "@/lib/api/auth";
import { tenantStore } from "@/lib/store/tenant";
import { authStore } from "@/lib/store/auth";
import { applyTenantTheme, buildTheme } from "@/lib/themes/utils";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_platform/onboarding/review")({
  component: OnboardingStep4,
});

const STEPS = ["Company details", "Brand", "Admin account", "Review"];

function OnboardingStep4() {
  const navigate = useNavigate();
  const draft = onboardingStore.useSelector((s) => s);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string } | null>(null);
  const [countdown, setCountdown] = useState(2.5);

  useEffect(() => {
    if (!done) return;
    const start = Date.now();
    const t = window.setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      setCountdown(Math.max(0, 2.5 - elapsed));
      if (elapsed >= 2.5) {
        window.clearInterval(t);
        navigate({ to: "/dashboard" });
      }
    }, 50);
    return () => window.clearInterval(t);
  }, [done, navigate]);

  const launch = async () => {
    setError(null);
    setSubmitting(true);
    const theme = buildTheme({
      primaryColor: draft.primaryColor,
      secondaryColor: draft.secondaryColor,
      accentColor: draft.accentColor,
    });
    const tenantRes = await tenantsApi.create({ settings: onboardingStore.toSettings(), theme });
    if (tenantRes.error || !tenantRes.data) {
      setError(tenantRes.error?.message ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }
    const authRes = await authApi.register({
      fullName: draft.adminFullName,
      email: draft.hrContactEmail,
      password: draft.adminPassword,
      tenantId: tenantRes.data.id,
    });
    if (authRes.error || !authRes.data) {
      setError(authRes.error?.message ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }
    tenantStore.setTenant(tenantRes.data);
    applyTenantTheme(tenantRes.data.theme);
    authStore.signIn(authRes.data.user, authRes.data.token);
    onboardingStore.reset();
    setDone({ name: draft.adminFullName });
  };

  if (done) {
    const progress = ((2.5 - countdown) / 2.5) * 100;
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md">
          <CheckCircle2 size={64} className="mx-auto text-[#16A34A]" />
          <h1 className="mt-6 text-[48px] font-bold tracking-[-0.01em] text-[#0A0A0A] leading-tight">
            Your workspace is ready.
          </h1>
          <p className="mt-3 text-[15px] text-[#6B6B6B]">Logging you in as {done.name}…</p>
          <div className="mt-8 h-1 w-full rounded-full bg-[#E5E5E3] overflow-hidden">
            <div className="h-full bg-[#F97316] transition-[width] duration-100" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (agree) launch(); }} noValidate>
      <StepIndicator steps={STEPS} currentStep={3} className="mb-10" />
      <StepCard
        title="Review and launch."
        description="Double-check the basics. You can edit everything from settings later."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => navigate({ to: "/onboarding/admin" })}>← Back</Button>
            <Button type="submit" size="lg" loading={submitting} disabled={!agree || submitting}>
              Launch workspace →
            </Button>
          </>
        }
      >
        {error && <Alert variant="error" onDismiss={() => setError(null)} className="mb-6">{error}</Alert>}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-10">
          <Card>
            <h3 className="text-[18px] font-semibold mb-4">{draft.companyName}</h3>
            <dl className="grid grid-cols-[140px_1fr] gap-y-3 text-[14px]">
              <dt className="text-[#6B6B6B]">Website</dt><dd className="text-[#0A0A0A]">{draft.domain}</dd>
              <dt className="text-[#6B6B6B]">Industry</dt><dd className="text-[#0A0A0A]">{draft.industry}</dd>
              <dt className="text-[#6B6B6B]">Size</dt><dd className="text-[#0A0A0A]">{draft.size}</dd>
              <dt className="text-[#6B6B6B]">Country</dt><dd className="text-[#0A0A0A]">{draft.country}</dd>
              <dt className="text-[#6B6B6B]">Admin</dt><dd className="text-[#0A0A0A]">{draft.adminFullName}</dd>
              <dt className="text-[#6B6B6B]">Email</dt><dd className="text-[#0A0A0A]">{draft.hrContactEmail}</dd>
            </dl>
            <div className="mt-6 pt-6 border-t border-[#E5E5E3]">
              <Checkbox
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                label={
                  <>I agree to the <a href="#" className="underline">Terms of Service</a> and <a href="#" className="underline">Privacy Policy</a>.</>
                }
              />
            </div>
          </Card>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B] mb-3">Your brand</p>
            <ThemePreview
              primary={draft.primaryColor}
              secondary={draft.secondaryColor}
              accent={draft.accentColor}
              companyName={draft.companyName}
            />
          </div>
        </div>
      </StepCard>
    </form>
  );
}