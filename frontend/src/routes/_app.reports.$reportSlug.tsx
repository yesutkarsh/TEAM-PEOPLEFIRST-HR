/** Standard report viewer: chart(s) + filterable export-ready table. */
import { useEffect, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Alert, Breadcrumb, Button, EmptyState, Spinner } from "@/lib/components/ui";
import { PermissionGuard } from "@/lib/components/rbac";
import { ReportChart, ReportExportMenu, ReportFilterBar, ReportTable } from "@/lib/components/reports";
import { getStandardReport, STANDARD_REPORT_META, STANDARD_REPORT_SLUGS, type StandardReport } from "@/lib/api/reports";

export const Route = createFileRoute("/_app/reports/$reportSlug")({
  component: StandardReportPage,
  pendingComponent: StandardReportSkeleton,
  errorComponent: StandardReportError,
  head: ({ params }) => {
    const meta = STANDARD_REPORT_SLUGS.includes(params.reportSlug as (typeof STANDARD_REPORT_SLUGS)[number])
      ? STANDARD_REPORT_META[params.reportSlug as (typeof STANDARD_REPORT_SLUGS)[number]]
      : { title: "Report", description: "Standard HRMS report." };
    return {
      meta: [
        { title: `${meta.title} — HRMS` },
        { name: "description", content: meta.description },
        { property: "og:title", content: `${meta.title} — HRMS` },
        { property: "og:description", content: meta.description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
});

function StandardReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-64 rounded-sm bg-[#F2F2F0] animate-pulse" />
      <div className="h-8 w-80 rounded-sm bg-[#F2F2F0] animate-pulse" />
      <div className="h-14 rounded-md border border-[#E5E5E3] bg-white animate-pulse" />
      <div className="h-56 rounded-md border border-[#E5E5E3] bg-white animate-pulse" />
      <div className="h-64 rounded-md border border-[#E5E5E3] bg-white animate-pulse" />
    </div>
  );
}

function StandardReportError({ reset }: { reset: () => void }) {
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

function StandardReportPage() {
  return (
    <PermissionGuard
      permission="reports.view"
      fallback={
        <div className="space-y-4">
          <Breadcrumb items={[{ label: "Reports", to: "/reports" }, { label: "Report" }]} />
          <Alert variant="warning">You don't have permission to view reports. Contact your administrator if you believe this is a mistake.</Alert>
        </div>
      }
    >
      <StandardReportInner />
    </PermissionGuard>
  );
}

function StandardReportInner() {
  const { reportSlug } = useParams({ from: "/_app/reports/$reportSlug" });
  const [report, setReport] = useState<StandardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    void getStandardReport(reportSlug).then((r) => {
      if (r.error || !r.data) {
        setNotFound(true);
      } else {
        setReport(r.data);
      }
      setLoading(false);
    });
  }, [reportSlug]);

  if (!loading && notFound) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Reports", to: "/reports" }, { label: "Unknown report" }]} />
        <EmptyState
          title="We don't have a report by that name"
          subtitle="It may have been renamed or removed. Head back to browse the available reports."
          action={<Link to="/reports"><Button variant="primary">← Back to reports</Button></Link>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Reports", to: "/reports" }, { label: report?.title ?? "Report" }]} />
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-[#0A0A0A]">{loading ? "Loading…" : report?.title}</h1>
        {report?.description && <p className="mt-1 text-[15px] text-[#6B6B6B]">{report.description}</p>}
      </div>

      <ReportFilterBar>
        <span className="text-[13px] text-[#6B6B6B]">Standard report — data refreshed automatically.</span>
      </ReportFilterBar>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {report?.charts.map((c) => (
              <ReportChart key={c.title} title={c.title} points={c.points} kind={c.kind} />
            ))}
          </div>

          <div className="flex justify-end">
            <ReportExportMenu rows={report?.rows ?? []} columns={report?.columns ?? []} filenameBase={reportSlug} />
          </div>

          <ReportTable columns={report?.columns ?? []} rows={report?.rows ?? []} />
        </>
      )}
    </div>
  );
}
