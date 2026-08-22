import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Breadcrumb, Card } from "@/lib/components/ui";
import { PlatformMetricGrid, TenantTable } from "@/lib/components/superadmin";
import { adminApi } from "@/lib/api/admin";
import type { PlatformMetrics, TenantSummary } from "@/lib/types/admin";

export const Route = createFileRoute("/_admin/admin/dashboard")({
  component: AdminDashboard,
  head: () => ({ meta: [{ title: "Platform Dashboard — HRMS Admin" }] }),
  errorComponent: ({ reset }) => (
    <ErrorBoundary reset={reset} />
  ),
});

function AdminDashboard() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const [m, t] = await Promise.all([adminApi.getPlatformMetrics(), adminApi.listTenants()]);
    if (m.data) setMetrics(m.data);
    if (t.data) setTenants(t.data);
    setLoading(false);
  };

  useEffect(() => { void reload(); }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Breadcrumb items={[{ label: "Platform" }, { label: "Dashboard" }]} />
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[32px] font-bold tracking-[-0.01em]">Platform overview</h1>
          <p className="mt-1 text-[14px] text-[#6B6B6B]">Across all tenants on HRMS.</p>
        </div>
      </div>
      {metrics ? (
        <PlatformMetricGrid metrics={metrics} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-[124px] animate-pulse bg-[#F2F2F0]" />
          ))}
        </div>
      )}
      <div>
        <h2 className="text-[18px] font-semibold mb-3">Tenants</h2>
        <TenantTable data={tenants} loading={loading} onChange={reload} />
      </div>
    </div>
  );
}

function ErrorBoundary({ reset }: { reset: () => void }) {
  return (
    <div className="max-w-md mx-auto text-center py-20">
      <h2 className="text-[22px] font-semibold">Something went wrong.</h2>
      <p className="mt-2 text-[14px] text-[#6B6B6B]">We couldn't load this page. Try refreshing.</p>
      <button onClick={reset} className="mt-6 inline-flex h-10 px-4 rounded-md bg-[#0A0A0A] text-white text-[14px] font-medium">Try again</button>
    </div>
  );
}
