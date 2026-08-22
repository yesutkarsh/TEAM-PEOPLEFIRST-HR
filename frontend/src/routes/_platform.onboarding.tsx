/** Onboarding Step 1: company details. */
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { StepIndicator, StepCard } from "@/lib/components/onboarding";
import { Input, Button, Select } from "@/lib/components/ui";
import { onboardingStore } from "@/lib/store/onboarding";
import { emailSchema } from "@/lib/utils/validation";

export const Route = createFileRoute("/_platform/onboarding")({
  component: OnboardingStep1,
});

const STEPS = ["Company details", "Brand", "Admin account", "Review"];

const INDUSTRIES = [
  "Software & Technology",
  "Financial Services",
  "Healthcare",
  "Retail & E-commerce",
  "Manufacturing",
  "Education",
  "Professional Services",
  "Media & Entertainment",
  "Other",
].map((v) => ({ value: v, label: v }));

const SIZES = [
  { value: "1-50", label: "1–50 employees" },
  { value: "51-200", label: "51–200 employees" },
  { value: "201-500", label: "201–500 employees" },
  { value: "501-2000", label: "501–2,000 employees" },
  { value: "2000+", label: "2,000+ employees" },
];

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany", "France",
  "India", "Singapore", "United Arab Emirates", "Other",
].map((v) => ({ value: v, label: v }));

function OnboardingStep1() {
  const navigate = useNavigate();
  const draft = onboardingStore.useSelector((s) => s);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const errs: Record<string, string> = {};
    if (draft.companyName.trim().length < 2) errs.companyName = "Min 2 characters";
    try { new URL(draft.domain.startsWith("http") ? draft.domain : `https://${draft.domain}`); } catch { errs.domain = "Enter a valid URL"; }
    if (!draft.industry) errs.industry = "Required";
    if (!draft.size) errs.size = "Required";
    if (!draft.country) errs.country = "Required";
    if (draft.hrContactName.trim().length < 2) errs.hrContactName = "Required";
    const emailRes = emailSchema.safeParse(draft.hrContactEmail);
    if (!emailRes.success) errs.hrContactEmail = emailRes.error.issues[0].message;
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      navigate({ to: "/onboarding/brand" });
    } else if (typeof window !== "undefined") {
      // Scroll to top so the banner is visible
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const set = (patch: Partial<typeof draft>) => onboardingStore.update(patch);

  const errorCount = Object.keys(errors).length;
  const showBanner = submitted && errorCount > 0;

  return (
    <form onSubmit={submit} noValidate>
      <StepIndicator steps={STEPS} currentStep={0} className="mb-10" />
      <StepCard
        title="Let's set up your workspace."
        description="Takes about 4 minutes. No credit card required."
        footer={
          <>
            <span className="text-[13px] text-[#6B6B6B]">Step 1 of 4</span>
            <Button type="submit" size="lg">Continue →</Button>
          </>
        }
      >
        {showBanner && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-6 rounded-sm border border-[#FECACA] bg-[#FEF2F2] px-4 py-3"
          >
            <p className="text-[13px] font-semibold text-[#991B1B]">
              Please fix {errorCount} {errorCount === 1 ? "field" : "fields"} before continuing.
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <Input
            label="Company name"
            value={draft.companyName}
            onChange={(e) => set({ companyName: e.target.value })}
            error={errors.companyName}
            autoFocus
          />
          <Input
            label="Company website"
            placeholder="https://acme.com"
            value={draft.domain}
            onChange={(e) => set({ domain: e.target.value })}
            error={errors.domain}
          />
          <Select
            label="Industry"
            placeholder="Select industry"
            options={INDUSTRIES}
            value={draft.industry}
            onChange={(e) => set({ industry: e.target.value })}
            error={errors.industry}
          />
          <Select
            label="Company size"
            placeholder="Select size"
            options={SIZES}
            value={draft.size}
            onChange={(e) => set({ size: e.target.value as typeof draft.size })}
            error={errors.size}
          />
          <Select
            label="Country of incorporation"
            placeholder="Select country"
            options={COUNTRIES}
            value={draft.country}
            onChange={(e) => set({ country: e.target.value })}
            error={errors.country}
          />
          <div className="hidden md:block" />
          <Input
            label="Primary HR contact name"
            value={draft.hrContactName}
            onChange={(e) => set({ hrContactName: e.target.value })}
            error={errors.hrContactName}
          />
          <Input
            label="Primary HR contact email"
            type="email"
            value={draft.hrContactEmail}
            onChange={(e) => set({ hrContactEmail: e.target.value })}
            error={errors.hrContactEmail}
          />
        </div>
      </StepCard>
    </form>
  );
}