import { StatCard } from "@/lib/components/ui";
import type { PlatformMetrics } from "@/lib/types/admin";

export function PlatformMetricGrid({ metrics }: { metrics: PlatformMetrics }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard accent="platform" label="Total tenants" value={metrics.totalTenants} trend={metrics.totalTenantsTrend} trendDir="up" />
      <StatCard accent="platform" label="Total employees" value={metrics.totalEmployees.toLocaleString()} trend={metrics.totalEmployeesTrend} trendDir="up" />
      <StatCard accent="platform" label="New tenants this month" value={metrics.newTenantsThisMonth} trend={metrics.newTenantsTrend} trendDir={metrics.newTenantsThisMonth >= 2 ? "up" : "down"} />
      <StatCard accent="platform" label="Tenants in trial" value={metrics.tenantsInTrial} trend={metrics.tenantsInTrialTrend} trendDir="neutral" />
    </div>
  );
}
