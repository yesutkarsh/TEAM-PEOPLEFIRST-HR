/** Payroll runs list — create new runs, open run detail. */
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/lib/components/layout";
import { Button, EmptyState, showToast } from "@/lib/components/ui";
import { PermissionGuard } from "@/lib/components/rbac";
import { CreateRunModal, PayrollRunCard } from "@/lib/components/payroll";
import { authStore } from "@/lib/store/auth";
import { payrollApi } from "@/lib/api/payroll";
import type { PayrollRun } from "@/lib/types/payroll";

export const Route = createFileRoute("/_app/payroll/runs/")({
  component: PayrollRunsPage,
  head: () => ({
    meta: [
      { title: "Payroll Runs — HRMS" },
      { name: "description", content: "Create and track monthly payroll runs from draft through payment." },
      { property: "og:title", content: "Payroll Runs — HRMS" },
      { property: "og:description", content: "Create and track monthly payroll runs from draft through payment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PayrollRunsPage() {
  const navigate = useNavigate();
  const user = authStore.useSelector((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  const reload = () => {
    setLoading(true);
    void payrollApi.listRuns().then((r) => {
      setRuns(r.data ?? []);
      setLoading(false);
    });
  };
  useEffect(reload, []);

  const create = async (input: { month: number; year: number; notes?: string }) => {
    const res = await payrollApi.createRun({ ...input, initiatedBy: user?.fullName ?? "You" });
    if (res.error) throw new Error(res.error.message);
    showToast("Payroll run created.", "success");
    setCreateOpen(false);
    reload();
    if (res.data) navigate({ to: "/payroll/runs/$runId", params: { runId: res.data.id } });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll runs"
        description="Every payroll run, from draft to paid."
        actions={
          <PermissionGuard permission="payroll.run">
            <Button variant="primary" onClick={() => setCreateOpen(true)}>Create new run</Button>
          </PermissionGuard>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-[96px] rounded-md border border-[#E5E5E3] bg-white animate-pulse" />)}
        </div>
      ) : runs.length === 0 ? (
        <EmptyState
          title="No payroll runs yet"
          subtitle="Create a payroll run for the current month to get started."
          action={
            <PermissionGuard permission="payroll.run">
              <Button variant="primary" onClick={() => setCreateOpen(true)}>Create new run</Button>
            </PermissionGuard>
          }
        />
      ) : (
        <div className="space-y-3">
          {runs.map((r) => <PayrollRunCard key={r.id} run={r} />)}
        </div>
      )}

      <CreateRunModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={create} />
    </div>
  );
}
