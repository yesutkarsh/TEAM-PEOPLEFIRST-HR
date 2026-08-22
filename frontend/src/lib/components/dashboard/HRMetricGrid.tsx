import { StatCard } from "@/lib/components/ui";
import type { HRMetrics } from "@/lib/types/dashboard";
import { Users, Calendar, Briefcase, Bell } from "lucide-react";

export function HRMetricGrid({ metrics }: { metrics: HRMetrics }) {
  const hasPending = metrics.pendingApprovals > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* Total Employees Tile with Micro Bar Visualizer */}
      <StatCard
        label="Total workforce"
        value={metrics.totalEmployees}
        trend={metrics.totalEmployeesNote}
        trendDir="up"
        icon={<Users className="w-4 h-4" />}
      >
        <div className="flex items-end gap-1.5 h-6 pt-2" aria-hidden>
          <div className="flex-1 bg-neutral-900 rounded-t h-full" />
          <div className="flex-1 bg-neutral-900/80 rounded-t h-[80%]" />
          <div className="flex-1 bg-neutral-900/60 rounded-t h-[65%]" />
          <div className="flex-1 bg-neutral-900/40 rounded-t h-[45%]" />
          <div className="flex-1 bg-[#F97316] rounded-t h-[90%]" />
        </div>
      </StatCard>

      {/* On Leave Today Tile with Mini Gauge Badge */}
      <StatCard
        label="On leave today"
        value={metrics.onLeaveToday}
        trend={metrics.onLeaveTodayNote}
        trendDir="neutral"
        icon={<Calendar className="w-4 h-4" />}
      >
        <div className="mt-1 flex items-center justify-between text-xs text-[#6B6B6B]">
          <span>Present: {Math.max(0, metrics.totalEmployees - metrics.onLeaveToday)}</span>
          <span className="font-semibold text-emerald-600">
            {metrics.totalEmployees ? Math.round(((metrics.totalEmployees - metrics.onLeaveToday) / metrics.totalEmployees) * 100) : 100}% present
          </span>
        </div>
      </StatCard>

      {/* Open Positions Tile with Slant Action Arrow */}
      <StatCard
        label="Open requisitions"
        value={metrics.openPositions}
        trend={metrics.openPositionsNote}
        trendDir="neutral"
        icon={<Briefcase className="w-4 h-4" />}
        actionHint
      >
        <div className="mt-1 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[11px] font-medium text-[#6B6B6B]">Active recruiting pipelines</span>
        </div>
      </StatCard>

      {/* Pending Approvals High-Contrast Dark Bento Callout Tile */}
      <StatCard
        label="Pending approvals"
        value={metrics.pendingApprovals}
        trend={metrics.pendingApprovalsNote}
        trendDir={hasPending ? "down" : "up"}
        variant={hasPending ? "dark" : "default"}
        actionHint
        icon={<Bell className="w-4 h-4" />}
      >
        <div className="mt-1 flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              hasPending ? "bg-orange-500 animate-ping" : "bg-emerald-500"
            }`}
          />
          <span className={`text-[11px] font-medium ${hasPending ? "text-neutral-300" : "text-[#6B6B6B]"}`}>
            {hasPending ? "Requires manager decision" : "Inbox zero"}
          </span>
        </div>
      </StatCard>
    </div>
  );
}

