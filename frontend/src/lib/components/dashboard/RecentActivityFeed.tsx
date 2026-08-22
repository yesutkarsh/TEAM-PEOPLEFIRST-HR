import { Avatar, EmptyState } from "@/lib/components/ui";
import type { ActivityItem } from "@/lib/types/dashboard";
import { Activity } from "lucide-react";

export function RecentActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="rounded-2xl border border-[#E5E5E3] bg-white p-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#F2F2F0] flex items-center gap-2 bg-[#FAFAF9]">
        <Activity className="w-4 h-4 text-[#8E8E8E]" />
        <div>
          <h3 className="text-[14px] font-bold text-[#0A0A0A] tracking-tight">Recent activity</h3>
          <p className="text-[11px] text-[#8E8E8E] font-medium">Real-time log of team events</p>
        </div>
      </div>
      {items.length === 0 ? (
        <EmptyState title="No recent activity logged." />
      ) : (
        <ul className="divide-y divide-[#F4F4F2]">
          {items.map((a) => (
            <li key={a.id} className="px-5 py-3 flex items-start gap-3.5 hover:bg-[#FAFAF9] transition-colors">
              <Avatar initials={a.actorInitials} className="shrink-0 mt-0.5 ring-2 ring-neutral-100" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[#0A0A0A] leading-snug">
                  <span className="font-bold">{a.actorName}</span>{" "}
                  <span className="text-[#6B6B6B]">{a.description}</span>
                </p>
                <p className="text-[11px] font-medium text-[#8E8E8E] mt-1">{a.timestamp}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

