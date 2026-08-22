/** Regularization layout — tabbed nav between my requests and the approvals queue. */
import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { Breadcrumb } from "@/lib/components/ui";
import { usePermission } from "@/lib/hooks/usePermission";
import { ArrowUpRight, Sparkles, Clock, CheckSquare, Calendar, Users } from "lucide-react";

export const Route = createFileRoute("/_app/attendance/regularization")({
  component: RegularizationLayout,
});

function RegularizationLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const canApprove = usePermission(["attendance.manage", "attendance.view_team"]);

  const tabs = [
    { label: "My requests", to: "/attendance/regularization", icon: Clock },
    ...(canApprove ? [{ label: "Approvals queue", to: "/attendance/regularization/approvals", icon: CheckSquare }] : []),
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-7 pb-12">
      <Breadcrumb
        items={[
          { label: "Overview", to: "/dashboard" },
          { label: "Attendance", to: "/attendance" },
          { label: "Regularization" },
        ]}
      />

      {/* Minimal Header Card Surface */}
      <header className="rounded-3xl border border-[#E5E5E3] bg-white p-6 sm:p-7 shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[24px] sm:text-[28px] font-extrabold tracking-tight text-[#0A0A0A] font-sans">
            Regularization
          </h1>
          <p className="mt-1 text-[13px] sm:text-[14px] text-[#6B6B6B] font-medium">
            Fix missed clock-ins or clock-outs and manage team regularization requests.
          </p>
        </div>

        {/* Quick Action Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/attendance"
            className="group inline-flex items-center gap-1.5 rounded-xl bg-[#FAFAF9] hover:bg-[#F2F2F0] border border-[#E5E5E3] px-3.5 py-2 text-xs font-bold text-[#0A0A0A] transition-all active:scale-95 shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-[#8E8E8E]" />
            My Attendance
            <ArrowUpRight className="w-3.5 h-3.5 text-[#8E8E8E] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#0A0A0A]" />
          </Link>
          <Link
            to="/attendance/team"
            className="group inline-flex items-center gap-1.5 rounded-xl bg-[#FAFAF9] hover:bg-[#F2F2F0] border border-[#E5E5E3] px-3.5 py-2 text-xs font-bold text-[#0A0A0A] transition-all active:scale-95 shadow-2xs"
          >
            <Users className="w-3.5 h-3.5 text-[#8E8E8E]" />
            Team Attendance
            <ArrowUpRight className="w-3.5 h-3.5 text-[#8E8E8E] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#0A0A0A]" />
          </Link>
        </div>
      </header>

      {/* Modern Bento Segmented Nav Pills */}
      <nav aria-label="Regularization sections">
        <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-[#FAFAF9] border border-[#E5E5E3] shadow-xs">
          {tabs.map((t) => {
            const active =
              t.to === "/attendance/regularization"
                ? pathname === t.to || pathname === t.to + "/"
                : pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`inline-flex items-center gap-2 px-4 py-2 text-[13px] font-bold rounded-xl transition-all duration-200 ${active
                  ? "bg-[#0A0A0A] text-white shadow-sm"
                  : "text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-[#F2F2F0]"
                  }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-orange-400" : "text-[#8E8E8E]"}`} />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <Outlet />
    </div>
  );
}

