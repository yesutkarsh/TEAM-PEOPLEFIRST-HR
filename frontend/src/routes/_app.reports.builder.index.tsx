/** Custom report builder — new report. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Alert, Breadcrumb, Button } from "@/lib/components/ui";
import { PermissionGuard } from "@/lib/components/rbac";
import { CustomReportBuilder } from "@/lib/components/reports";

export const Route = createFileRoute("/_app/reports/builder/")({
  component: BuilderPage,
  pendingComponent: BuilderSkeleton,
  errorComponent: BuilderError,
  head: () => ({
    meta: [
      { title: "New Custom Report — HRMS" },
      { name: "description", content: "Build a custom report by choosing a data source, fields, filters, grouping and sorting." },
      { property: "og:title", content: "New Custom Report — HRMS" },
      { property: "og:description", content: "Build a custom report by choosing a data source, fields, filters, grouping and sorting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function BuilderSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 rounded-sm bg-[#F2F2F0] animate-pulse" />
      <div className="h-72 rounded-md border border-[#E5E5E3] bg-white animate-pulse" />
      <div className="h-64 rounded-md border border-[#E5E5E3] bg-white animate-pulse" />
    </div>
  );
}

function BuilderError({ reset }: { reset: () => void }) {
  return (
    <div className="space-y-4">
      <Alert variant="error">Something went wrong loading the report builder.</Alert>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={reset}>Try again</Button>
        <Link to="/reports" className="text-[13px] text-[var(--tenant-primary)] hover:underline self-center">
          ← Back to reports
        </Link>
      </div>
    </div>
  );
}

function BuilderPage() {
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
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Reports", to: "/reports" }, { label: "Custom report builder" }]} />
        <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-[#0A0A0A]">Custom report builder</h1>
        <CustomReportBuilder />
      </div>
    </PermissionGuard>
  );
}
