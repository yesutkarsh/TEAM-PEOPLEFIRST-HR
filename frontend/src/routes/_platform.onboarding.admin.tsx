/** Onboarding Step 3: admin account. */
import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { StepIndicator, StepCard } from "@/lib/components/onboarding";
import { Input, Button } from "@/lib/components/ui";
import { Eye, EyeOff } from "lucide-react";
import { onboardingStore } from "@/lib/store/onboarding";
import { passwordStrength } from "@/lib/utils/validation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_platform/onboarding/admin")({
  component: OnboardingStep3,
});

const STEPS = ["Company details", "Brand", "Admin account", "Review"];

const STRENGTH_LABELS = ["Too short", "Weak", "Fair", "Strong", "Very strong"] as const;
const STRENGTH_COLORS = ["#E5E5E3", "#DC2626", "#F59E0B", "#16A34A", "#15803D"] as const;

function OnboardingStep3() {
  const navigate = useNavigate();
  const draft = onboardingStore.useSelector((s) => s);
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const strength = useMemo(() => passwordStrength(draft.adminPassword), [draft.adminPassword]);
  const matches = draft.adminPassword.length > 0 && draft.adminPassword === confirm;
  const canContinue = matches && strength >= 2;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (draft.adminFullName.trim().length < 2) errs.adminFullName = "Required";
    if (strength < 2) errs.adminPassword = "Min 8 chars, 1 uppercase, 1 number";
    if (!matches) errs.confirm = "Passwords don't match";
    setErrors(errs);
    if (Object.keys(errs).length === 0) navigate({ to: "/onboarding/review" });
  };

  return (
    <form onSubmit={submit} noValidate>
      <StepIndicator steps={STEPS} currentStep={2} className="mb-10" />
      <StepCard
        title="Create your admin account."
        description="You'll be the first user. Invite teammates from your dashboard."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => navigate({ to: "/onboarding/brand" })}>← Back</Button>
            <Button type="submit" size="lg" disabled={!canContinue}>Continue →</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 max-w-2xl">
          <Input
            label="Full name"
            value={draft.adminFullName}
            onChange={(e) => onboardingStore.update({ adminFullName: e.target.value })}
            error={errors.adminFullName}
            autoFocus
          />
          <Input
            label="Work email"
            type="email"
            value={draft.hrContactEmail}
            readOnly
            disabled
            hint="Pre-filled from step 1"
          />
          <div className="md:col-span-2">
            <div className="relative">
              <Input
                label="Password"
                type={show ? "text" : "password"}
                value={draft.adminPassword}
                onChange={(e) => onboardingStore.update({ adminPassword: e.target.value })}
                error={errors.adminPassword}
                hint="Min 8 characters, 1 uppercase, 1 number"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShow((v) => !v); } }}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-3 top-[34px] text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="mt-3 flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="h-1.5 flex-1 rounded-full transition-colors duration-150 motion-reduce:transition-none"
                  style={{ background: i < strength ? STRENGTH_COLORS[strength] : "#E5E5E3" }}
                />
              ))}
            </div>
            <p className={cn("mt-2 text-[13px]", strength >= 2 ? "text-[#16A34A]" : "text-[#6B6B6B]")}>
              {STRENGTH_LABELS[strength]}
            </p>
          </div>
          <div className="md:col-span-2">
            <Input
              label="Confirm password"
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={errors.confirm}
            />
          </div>
        </div>
      </StepCard>
    </form>
  );
}