/** Platform shell — always Default Theme, centered no-chrome layout. */
import { Outlet, Link, createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { resetToDefaultTheme } from "@/lib/themes/utils";

export const Route = createFileRoute("/_platform")({
  component: PlatformLayout,
});

function PlatformLayout() {
  useEffect(() => {
    // Platform pages must ignore any tenant theme.
    resetToDefaultTheme();
  }, []);

  return (
    <div className="min-h-screen bg-[#F9F9F7] text-[#0A0A0A] font-sans antialiased">
      <header className="h-16 px-6 md:px-10 flex items-center justify-between">
        <Link to="/onboarding" className="text-[20px] font-bold tracking-[-0.01em]">HRMS.</Link>
        <Link to="/login" className="text-[14px] text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
          Already have an account? <span className="underline underline-offset-4">Sign in</span>
        </Link>
      </header>
      <main className="px-6 md:px-10 pb-20 pt-6">
        <div className="mx-auto w-full max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}