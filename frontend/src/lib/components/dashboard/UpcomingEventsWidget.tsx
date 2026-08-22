import { EmptyState } from "@/lib/components/ui";
import type { UpcomingEvent } from "@/lib/types/dashboard";
import { CalendarDays } from "lucide-react";

const ICONS = { birthday: "🎂", anniversary: "🎉", probation: "⏰" } as const;

export function UpcomingEventsWidget({ items }: { items: UpcomingEvent[] }) {
  return (
    <div className="rounded-2xl border border-[#E5E5E3] bg-white p-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#F2F2F0] flex items-center justify-between bg-[#FAFAF9]">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-[#8E8E8E]" />
          <div>
            <h3 className="text-[14px] font-bold text-[#0A0A0A] tracking-tight">Upcoming events</h3>
            <p className="text-[11px] text-[#8E8E8E] font-medium">Milestones in the next 7 days</p>
          </div>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-orange-50 text-orange-700 border border-orange-200">
          Next 7 Days
        </span>
      </div>

      {items.length === 0 ? (
        <EmptyState title="No upcoming events." subtitle="No birthdays or work anniversaries this week." />
      ) : (
        <ul className="divide-y divide-[#F4F4F2]">
          {items.map((e) => (
            <li key={e.id} className="px-5 py-3 flex items-center gap-3.5 hover:bg-[#FAFAF9] transition-colors">
              <span className="text-xl flex items-center justify-center w-8 h-8 rounded-xl bg-[#F4F4F2] shrink-0" aria-hidden>
                {ICONS[e.type]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-[#0A0A0A] truncate">{e.employeeName}</p>
                <p className="text-[11px] text-[#8E8E8E] truncate mt-0.5">{e.description}</p>
              </div>
              <span className="text-[11px] font-semibold text-[#0A0A0A] bg-[#FAFAF9] border border-[#E5E5E3] px-2 py-0.5 rounded-md shrink-0">
                {e.date}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

