/** Payroll overview — current run status, KPIs, recent runs, quick actions. */
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/lib/components/layout";
import { Button, Card, EmptyState, StatCard } from "@/lib/components/ui";
import { PermissionGuard } from "@/lib/components/rbac";
import { PayrollRunCard } from "@/lib/components/payroll";
import { payrollApi } from "@/lib/api/payroll";
import { formatCurrency } from "@/lib/utils/format";
import type { PayrollRun } from "@/lib/types/payroll";

export const Route = createFileRoute("/_app/payroll/")({
  component: PayrollOverviewPage,
  head: () => ({
    meta: [
      { title: "Payroll — HRMS" },
      { name: "description", content: "Current payroll run status, headcount, gross and net pay, and recent runs." },
      { property: "og:title", content: "Payroll — HRMS" },
      { property: "og:description", content: "Current payroll run status, headcount, gross and net pay, and recent runs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PayrollOverviewPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [stats, setStats] = useState<{ ytdCost: number; employeesOnPayroll: number; lastRunLabel: string; pendingDeclarations: number } | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [r, s] = await Promise.all([payrollApi.listRuns(), payrollApi.dashboardStats()]);
      if (!alive) return;
      setRuns(r.data ?? []);
      setStats(s.data ?? null);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const current = runs[0];

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Payroll" description="Current month status, headcount and recent runs." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-[110px] rounded-md border border-[#E5E5E3] bg-white animate-pulse" />)}
        </div>
        <div className="h-[100px] rounded-md border border-[#E5E5E3] bg-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description="Current month status, headcount and recent runs."
        actions={
          <PermissionGuard permission="payroll.run">
            <Button variant="primary" onClick={() => navigate({ to: "/payroll/runs" })}>Go to payroll runs</Button>
          </PermissionGuard>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Employees on payroll" value={stats?.employeesOnPayroll ?? 0} />
        <StatCard label="Current month gross" value={formatCurrency(current?.totalGross ?? 0)} />
        <StatCard label="Current month deductions" value={formatCurrency(current?.totalDeductions ?? 0)} />
        <StatCard label="Current month net pay" value={formatCurrency(current?.totalNetPay ?? 0)} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-[#0A0A0A]">Last run</h2>
            <p className="text-[13px] text-[#6B6B6B] mt-0.5">{stats?.lastRunLabel ?? "—"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PermissionGuard permission="payroll.run">
              <Button size="sm" variant="secondary" onClick={() => navigate({ to: "/payroll/runs" })}>Create new run</Button>
            </PermissionGuard>
            <Button size="sm" variant="secondary" onClick={() => navigate({ to: "/payroll/payslips" })}>My payslips</Button>
            <Button size="sm" variant="secondary" onClick={() => navigate({ to: "/payroll/declarations" })}>Investment declarations</Button>
            {stats && stats.pendingDeclarations > 0 && (
              <span className="text-[12px] text-[#B45309] self-center">{stats.pendingDeclarations} pending declarations</span>
            )}
          </div>
        </div>
      </Card>

      <div>
        <h2 className="text-[15px] font-semibold text-[#0A0A0A] mb-3">Recent runs</h2>
        {runs.length === 0 ? (
          <EmptyState
            title="No payroll runs yet"
            subtitle="Create your first payroll run to get started."
            action={
              <PermissionGuard permission="payroll.run">
                <Button variant="primary" onClick={() => navigate({ to: "/payroll/runs" })}>Create payroll run</Button>
              </PermissionGuard>
            }
          />
        ) : (
          <div className="space-y-3">
            {runs.slice(0, 5).map((r) => <PayrollRunCard key={r.id} run={r} />)}
          </div>
        )}
      </div>
    </div>
  );
}
