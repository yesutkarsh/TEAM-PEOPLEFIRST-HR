/** Onboarding layout route. */
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_platform/onboarding")({
  component: OnboardingLayout,
});

function OnboardingLayout() {
  return <Outlet />;
}