/** Manager view — direct reports, goal progress, review status. */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/lib/components/layout";
import { EmptyState, Spinner, DataTable } from "@/lib/components/ui";
import {
  TeamReviewEmployeeCell, TeamReviewGoalsCell, TeamReviewStatusCell, TeamReviewSelfCell, TeamReviewActionCell,
  type TeamReviewRowData,
} from "@/lib/components/performance";
import { performanceApi } from "@/lib/api/performance";
import { listEmployees } from "@/lib/api/employees";
import { authStore } from "@/lib/store/auth";
import type { Employee } from "@/lib/types/employee";

export const Route = createFileRoute("/_app/performance/team")({
  component: TeamReviewsPage,
  pendingComponent: () => <div className="flex justify-center py-20"><Spinner size={28} /></div>,
  head: () => ({
    meta: [
      { title: "My Team — Performance — HRMS" },
      { name: "description", content: "Review your direct reports' goal progress and performance reviews." },
      { property: "og:title", content: "My Team — Performance — HRMS" },
      { property: "og:description", content: "Review your direct reports' goal progress and performance reviews." },
    ],
  }),
});

function TeamReviewsPage() {
  const user = authStore.useSelector((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TeamReviewRowData[]>([]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const emps = await listEmployees();
      const meEmp = emps.data?.find((e) => e.workEmail === user?.email) ?? emps.data?.[0] ?? null;
      if (!meEmp) { if (alive) setLoading(false); return; }
      const reports = (emps.data ?? []).filter((e: Employee) => e.reportingManagerId === meEmp.id);
      const built: TeamReviewRowData[] = [];
      for (const emp of reports) {
        const [rRes, oRes] = await Promise.all([
          performanceApi.listReviews({ employeeId: emp.id, managerId: meEmp.id }),
          performanceApi.listObjectives({ ownerId: emp.id }),
        ]);
        const review = rRes.data?.[0];
        if (!review) continue;
        const goals = oRes.data ?? [];
        const avgProgress = goals.length ? goals.reduce((s, g) => s + Math.min(100, g.progress), 0) / goals.length : 0;
        built.push({ employee: emp, review, goalCount: goals.length, avgProgress });
      }
      if (!alive) return;
      setRows(built);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user?.email]);

  const columns = useMemo(
    () => [
      { key: "employee", label: "Employee", render: (r: TeamReviewRowData) => <TeamReviewEmployeeCell employee={r.employee} /> },
      { key: "goals", label: "Goal progress", render: (r: TeamReviewRowData) => <TeamReviewGoalsCell goalCount={r.goalCount} avgProgress={r.avgProgress} /> },
      { key: "self", label: "Self-assessment", render: (r: TeamReviewRowData) => <TeamReviewSelfCell review={r.review} /> },
      { key: "status", label: "Status", render: (r: TeamReviewRowData) => <TeamReviewStatusCell review={r.review} /> },
      { key: "action", label: "", render: (r: TeamReviewRowData) => <TeamReviewActionCell row={r} /> },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="My team" description="Direct reports' goal progress and review status." />
      {loading ? (
        <DataTable columns={columns} data={[]} loading />
      ) : rows.length === 0 ? (
        <EmptyState title="No direct reports" subtitle="You don't have any direct reports assigned yet." />
      ) : (
        <DataTable columns={columns} data={rows} getRowKey={(r) => r.review.id} />
      )}
    </div>
  );
}
