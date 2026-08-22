import { Avatar, EmptyState } from "@/lib/components/ui";
import type { LeaveToday } from "@/lib/types/dashboard";
import { UserX } from "lucide-react";

export function TeamCalendarWidget({ items }: { items: LeaveToday[] }) {
  const visible = items.slice(0, 6);
  const extra = Math.max(0, items.length - 6);
  return (
    <div className="rounded-2xl border border-[#E5E5E3] bg-white p-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#F2F2F0] flex items-center justify-between bg-[#FAFAF9]">
        <div className="flex items-center gap-2">
          <UserX className="w-4 h-4 text-[#8E8E8E]" />
          <div>
            <h3 className="text-[14px] font-bold text-[#0A0A0A] tracking-tight">On leave today</h3>
            <p className="text-[11px] text-[#8E8E8E] font-medium">Team availability status</p>
          </div>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
          {items.length} out
        </span>
      </div>

      {visible.length === 0 ? (
        <EmptyState title="Full team in today!" subtitle="Everyone is available and accounted for." />
      ) : (
        <ul className="divide-y divide-[#F4F4F2]">
          {visible.map((l) => (
            <li key={l.id} className="px-5 py-3 flex items-center gap-3.5 hover:bg-[#FAFAF9] transition-colors">
              <Avatar initials={l.employeeInitials} className="shrink-0 ring-2 ring-neutral-100" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-[#0A0A0A] truncate">{l.employeeName}</p>
                <p className="text-[11px] text-[#8E8E8E] font-medium mt-0.5">{l.leaveType}</p>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F4F4F2] text-[#6B6B6B] border border-[#E5E5E3] shrink-0">
                Back {l.returnDate}
              </span>
            </li>
          ))}
          {extra > 0 && (
            <li className="px-5 py-2.5 text-[12px] text-[#8E8E8E] font-semibold bg-[#FAFAF9]">
              + {extra} more team members out
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

