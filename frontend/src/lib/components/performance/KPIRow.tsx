import type { KPI } from "@/lib/types/performance";

export function KPIRow({ kpi }: { kpi: KPI }) {
  const pct = kpi.actualValue !== undefined && kpi.targetValue
    ? Math.round((kpi.actualValue / kpi.targetValue) * 100)
    : null;
  return (
    <div className="flex items-center gap-3 py-2 border-t border-[#E5E5E3] first:border-t-0">
      <span className="flex-1 min-w-0 truncate text-[13px] text-[#0A0A0A]">{kpi.name}</span>
      <span className="text-[12px] text-[#6B6B6B] tabular-nums whitespace-nowrap">
        {kpi.actualValue ?? "—"} / {kpi.targetValue} {kpi.unit}
      </span>
      <span className="text-[12px] text-[#6B6B6B] tabular-nums w-12 text-right">{pct === null ? "—" : `${pct}%`}</span>
      <span className="text-[11px] text-[#9CA3AF] w-14 text-right">{kpi.weightage}% wt</span>
    </div>
  );
}
