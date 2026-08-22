import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const auth = window.localStorage.getItem("hrms.auth");
      if (auth) throw redirect({ to: "/dashboard" });
    }
    throw redirect({ to: "/onboarding" });
  },
  component: () => null,
});