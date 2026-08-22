/** Onboarding Step 2: brand colors + logo. */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { StepIndicator, StepCard, ThemePreview } from "@/lib/components/onboarding";
import { ColorPicker, LogoUpload } from "@/lib/components/forms";
import { Button, Badge } from "@/lib/components/ui";
import { onboardingStore } from "@/lib/store/onboarding";
import { contrastRatio, computeTextColor } from "@/lib/themes/utils";
import { DEFAULT_THEME } from "@/lib/themes/defaults";

export const Route = createFileRoute("/_platform/onboarding/brand")({
  component: OnboardingStep2,
});

const STEPS = ["Company details", "Brand", "Admin account", "Review"];

function OnboardingStep2() {
  const navigate = useNavigate();
  const draft = onboardingStore.useSelector((s) => s);
  const set = (patch: Partial<typeof draft>) => onboardingStore.update(patch);

  const onPrimary = computeTextColor(draft.primaryColor);
  const contrast = contrastRatio(draft.primaryColor, onPrimary);
  const showWarning = contrast < 4.5;

  const skip = () => {
    set({
      primaryColor: DEFAULT_THEME.primaryColor,
      secondaryColor: DEFAULT_THEME.secondaryColor,
      accentColor: DEFAULT_THEME.accentColor,
    });
    navigate({ to: "/onboarding/admin" });
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); navigate({ to: "/onboarding/admin" }); }}
      noValidate
    >
      <StepIndicator steps={STEPS} currentStep={1} className="mb-10" />
      <StepCard
        title="Make it yours."
        description="Upload your logo and pick brand colors. You can change these later."
        footer={
          <>
            <div className="flex items-center gap-4">
              <Button type="button" variant="ghost" onClick={() => navigate({ to: "/onboarding" })}>← Back</Button>
              <button type="button" onClick={skip} className="text-[13px] text-[#6B6B6B] hover:text-[#0A0A0A] underline underline-offset-4 transition-colors">
                Skip for now (use defaults)
              </button>
            </div>
            <Button type="submit" size="lg">Continue →</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-10">
          <div className="space-y-6">
            <LogoUpload value={draft.logoDataUrl} onChange={(v) => set({ logoDataUrl: v })} />
            <ColorPicker label="Primary color" value={draft.primaryColor} onChange={(v) => set({ primaryColor: v })} />
            <ColorPicker label="Secondary color" value={draft.secondaryColor} onChange={(v) => set({ secondaryColor: v })} />
            <ColorPicker label="Accent color" value={draft.accentColor} onChange={(v) => set({ accentColor: v })} />
            {showWarning && (
              <Badge variant="warning">Contrast warning — text on primary may be hard to read</Badge>
            )}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B] mb-3">Live preview</p>
            <ThemePreview
              primary={draft.primaryColor}
              secondary={draft.secondaryColor}
              accent={draft.accentColor}
              companyName={draft.companyName || "Your Company"}
            />
          </div>
        </div>
      </StepCard>
    </form>
  );
}