/** Custom report builder — editing an existing saved report. */
import { useEffect, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Alert, Breadcrumb, Button, EmptyState, Spinner } from "@/lib/components/ui";
import { PermissionGuard } from "@/lib/components/rbac";
import { CustomReportBuilder } from "@/lib/components/reports";
import { getSavedReport } from "@/lib/api/reports";
import type { SavedReport } from "@/lib/types/reports";

export const Route = createFileRoute("/_app/reports/builder/$reportId")({
  component: EditBuilderPage,
  pendingComponent: EditBuilderSkeleton,
  errorComponent: EditBuilderError,
  head: () => ({
    meta: [
      { title: "Edit Custom Report — HRMS" },
      { name: "description", content: "Edit an existing saved custom report's fields, filters, grouping and sorting." },
      { property: "og:title", content: "Edit Custom Report — HRMS" },
      { property: "og:description", content: "Edit an existing saved custom report's fields, filters, grouping and sorting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function EditBuilderSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 rounded-sm bg-[#F2F2F0] animate-pulse" />
      <div className="h-72 rounded-md border border-[#E5E5E3] bg-white animate-pulse" />
      <div className="h-64 rounded-md border border-[#E5E5E3] bg-white animate-pulse" />
    </div>
  );
}

function EditBuilderError({ reset }: { reset: () => void }) {
  return (
    <div className="space-y-4">
      <Alert variant="error">Something went wrong loading this report.</Alert>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={reset}>Try again</Button>
        <Link to="/reports" className="text-[13px] text-[var(--tenant-primary)] hover:underline self-center">
          ← Back to reports
        </Link>
      </div>
    </div>
  );
}

function EditBuilderPage() {
  return (
    <PermissionGuard
      permission="reports.create"
      fallback={
        <div className="space-y-4">
          <Breadcrumb items={[{ label: "Reports", to: "/reports" }, { label: "Builder" }]} />
          <Alert variant="warning">You don't have permission to build custom reports. Contact your administrator if you believe this is a mistake.</Alert>
        </div>
      }
    >
      <EditBuilderInner />
    </PermissionGuard>
  );
}

function EditBuilderInner() {
  const { reportId } = useParams({ from: "/_app/reports/builder/$reportId" });
  const [report, setReport] = useState<SavedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    void getSavedReport(reportId).then((r) => {
      if (r.error || !r.data) setNotFound(true);
      else setReport(r.data);
      setLoading(false);
    });
  }, [reportId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 rounded-sm bg-[#F2F2F0] animate-pulse" />
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Reports", to: "/reports" }, { label: "Unknown report" }]} />
        <EmptyState
          title="We couldn't find that saved report"
          subtitle="It may have been deleted. Head back to browse your saved reports."
          action={<Link to="/reports"><Button variant="primary">← Back to reports</Button></Link>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Reports", to: "/reports" }, { label: report.name }]} />
      <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-[#0A0A0A]">{report.name}</h1>
      <CustomReportBuilder initial={report} />
    </div>
  );
}
