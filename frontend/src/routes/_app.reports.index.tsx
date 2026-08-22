/** Reports hub: executive KPIs, natural-language bar, standard report tiles, saved reports. */
import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Alert, Breadcrumb, Button, ConfirmDialog, DataTable, Spinner, showToast, type ColumnDef } from "@/lib/components/ui";
import { PermissionGuard } from "@/lib/components/rbac";
import { ExecutiveKpiGrid, NaturalLanguageReportBar, ReportTile } from "@/lib/components/reports";
import { deleteReport, getExecutiveKpis, listSavedReports, STANDARD_REPORT_META, STANDARD_REPORT_SLUGS } from "@/lib/api/reports";
import type { ExecutiveKpi } from "@/lib/types/reports";
import type { SavedReport } from "@/lib/types/reports";

export const Route = createFileRoute("/_app/reports/")({
  component: ReportsHubPage,
  pendingComponent: ReportsHubSkeleton,
  errorComponent: ReportsHubError,
  head: () => ({
    meta: [
      { title: "Reports — HRMS" },
      { name: "description", content: "Executive KPIs, standard reports, natural-language queries and saved custom reports." },
      { property: "og:title", content: "Reports — HRMS" },
      { property: "og:description", content: "Executive KPIs, standard reports, natural-language queries and saved custom reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ReportsHubSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded-sm bg-[#F2F2F0] animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[110px] rounded-md border border-[#E5E5E3] bg-white animate-pulse" />
        ))}
      </div>
      <div className="h-24 rounded-md border border-[#E5E5E3] bg-white animate-pulse" />
    </div>
  );
}

function ReportsHubError({ reset }: { reset: () => void }) {
  return (
    <div className="space-y-4">
      <Alert variant="error">Something went wrong loading reports.</Alert>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={reset}>Try again</Button>
        <Link to="/dashboard" className="text-[13px] text-[var(--tenant-primary)] hover:underline self-center">
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}

function ReportsHubPage() {
  return (
    <PermissionGuard
      permission="reports.view"
      fallback={
        <div className="space-y-4">
          <Breadcrumb items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Reports" }]} />
          <Alert variant="warning">You don't have permission to view reports. Contact your administrator if you believe this is a mistake.</Alert>
        </div>
      }
    >
      <ReportsHubInner />
    </PermissionGuard>
  );
}

function ReportsHubInner() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<ExecutiveKpi[]>([]);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [saved, setSaved] = useState<SavedReport[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [toDelete, setToDelete] = useState<SavedReport | null>(null);

  const reload = () => {
    setLoadingSaved(true);
    void listSavedReports().then((r) => {
      setSaved(r.data ?? []);
      setLoadingSaved(false);
    });
  };

  useEffect(() => {
    void getExecutiveKpis().then((r) => {
      setKpis(r.data ?? []);
      setLoadingKpis(false);
    });
    reload();
  }, []);

  const columns: ColumnDef<SavedReport>[] = [
    { key: "name", label: "Name" },
    { key: "description", label: "Description", render: (r) => r.description ?? "—" },
    { key: "createdBy", label: "Created by" },
    { key: "lastRunAt", label: "Last run", render: (r) => (r.lastRunAt ? new Date(r.lastRunAt).toLocaleDateString() : "Never") },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => void navigate({ to: "/reports/builder/$reportId", params: { reportId: r.id } })}>
            View
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void navigate({ to: "/reports/builder/$reportId", params: { reportId: r.id } })}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => setToDelete(r)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const confirmDelete = async () => {
    if (!toDelete) return;
    const res = await deleteReport(toDelete.id);
    if (res.error) {
      showToast(res.error.message, "error");
      return;
    }
    showToast("Report deleted.", "success");
    setToDelete(null);
    reload();
  };

  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Reports" }]} />
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-[#0A0A0A]">Reports</h1>
        <p className="mt-1 text-[15px] text-[#6B6B6B]">Executive KPIs, standard reports and your saved custom reports.</p>
      </div>

      <ExecutiveKpiGrid kpis={kpis} loading={loadingKpis} />

      <NaturalLanguageReportBar />

      <section className="space-y-3">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Standard reports</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {STANDARD_REPORT_SLUGS.map((slug) => (
            <ReportTile key={slug} slug={slug} title={STANDARD_REPORT_META[slug].title} description={STANDARD_REPORT_META[slug].description} />
          ))}
        </div>
        <PermissionGuard permission="payroll.view_all">
          <Link to="/payroll" className="inline-block text-[13px] font-medium text-[var(--tenant-primary)] hover:underline">
            Looking for payroll reports? View them under Payroll →
          </Link>
        </PermissionGuard>
      </section>

      <PermissionGuard permission="reports.create">
        <section className="flex items-center justify-between">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Build a custom report</h2>
          <Button variant="primary" onClick={() => void navigate({ to: "/reports/builder" })}>
            New custom report
          </Button>
        </section>
      </PermissionGuard>

      {!loadingSaved && saved.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Saved reports</h2>
          <DataTable columns={columns} data={saved} loading={loadingSaved} getRowKey={(r) => r.id} />
        </section>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete saved report?"
        description={`"${toDelete?.name ?? ""}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
