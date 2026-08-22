/** Candidate portal shell — no HRMS chrome, applies the tenant theme. */
import { Outlet, Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { tenantStore } from "@/lib/store/tenant";
import { applyTenantTheme } from "@/lib/themes/utils";
import { getCandidateById, getPortalSession, clearPortalSession } from "@/lib/utils/localStorage";

export const Route = createFileRoute("/_portal")({
  head: () => ({ meta: [{ title: "Candidate Portal" }] }),
  component: PortalLayout,
});

function PortalLayout() {
  const navigate = useNavigate();
  const tenant = tenantStore.useSelector((s) => s.tenant);
  const theme = tenantStore.useSelector((s) => s.theme);
  const [candidateName, setCandidateName] = useState<string | null>(null);

  useEffect(() => {
    applyTenantTheme(theme);
  }, [theme]);

  useEffect(() => {
    const session = getPortalSession();
    if (session) {
      const candidate = getCandidateById(session.candidateId);
      if (candidate) setCandidateName(`${candidate.firstName} ${candidate.lastName}`);
    }
  }, []);

  const onSignOut = () => {
    clearPortalSession();
    navigate({ to: "/portal" });
  };

  const companyName = tenant?.settings.companyName ?? "HRMS";

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F9F7] text-[#0A0A0A] font-sans antialiased">
      <header className="h-16 px-6 border-b border-[#E5E5E3] bg-white flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {tenant?.settings.logoDataUrl ? (
            <img src={tenant.settings.logoDataUrl} alt={companyName} className="h-8 w-8 rounded object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded bg-[var(--tenant-primary)] text-[var(--tenant-text-on-primary)] font-semibold text-[13px]">
              {companyName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="text-[15px] font-semibold truncate">{companyName}</span>
        </div>
        {candidateName ? (
          <div className="flex items-center gap-4">
            <span className="text-[14px] text-[#6B6B6B] hidden sm:inline">{candidateName}</span>
            <button
              type="button"
              onClick={onSignOut}
              className="text-[13px] text-[#6B6B6B] hover:text-[#0A0A0A] underline underline-offset-4"
            >
              Sign out
            </button>
          </div>
        ) : null}
      </header>
      <main className="flex-1 flex justify-center px-6 py-10">
        <div className="w-full max-w-2xl">
          <Outlet />
        </div>
      </main>
      <footer className="py-6 text-center text-[12px] text-[#9CA3AF]">
        © {new Date().getFullYear()} {companyName}. All rights reserved.
      </footer>
    </div>
  );
}
