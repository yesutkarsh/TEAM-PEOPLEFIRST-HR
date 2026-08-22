import { StatCard } from "@/lib/components/ui";
import type { ExecutiveKpi } from "@/lib/types/reports";

export function ExecutiveKpiGrid({ kpis, loading }: { kpis: ExecutiveKpi[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[110px] rounded-md border border-[#E5E5E3] bg-white animate-pulse" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {kpis.map((k) => (
        <StatCard key={k.key} label={k.label} value={k.value} trend={k.trend} trendDir={k.trendDir} />
      ))}
    </div>
  );
}
