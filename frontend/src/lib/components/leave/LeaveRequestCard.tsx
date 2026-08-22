import { Calendar, ArrowUpRight } from "lucide-react";
import { Avatar, Button } from "@/lib/components/ui";
import { formatRange } from "@/lib/utils/workingDays";
import type { LeaveRequest } from "@/lib/types/leave";
import { LeaveStatusBadge } from "./LeaveStatusBadge";
import { LeaveTypeBadge } from "./LeaveTypeBadge";

export interface LeaveRequestCardProps {
  request: LeaveRequest;
  showEmployee?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  onOpen?: () => void;
}

export function LeaveRequestCard({
  request,
  showEmployee,
  onApprove,
  onReject,
  onCancel,
  onOpen,
}: LeaveRequestCardProps) {
  return (
    <div className="rounded-2xl border border-[#E5E5E3] bg-white p-5 hover:border-[#D1D1CF] transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.03)] group relative overflow-hidden flex flex-col justify-between">
      <div>
        {/* Header flex row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {showEmployee && (
              <div className="flex items-center gap-2 mr-1">
                <Avatar name={request.employeeName} size={32} className="shrink-0 rounded-xl" />
                <span className="text-[14px] font-bold text-[#0A0A0A] tracking-tight">{request.employeeName}</span>
              </div>
            )}
            <LeaveTypeBadge leaveType={request.leaveType} size="sm" />
            <LeaveStatusBadge status={request.status} />
          </div>

          {/* Quick Date Applied Pill */}
          <span className="text-[11px] font-semibold text-[#8E8E8E] uppercase tracking-wider">
            Applied {new Date(request.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>

        {/* Date Range & Duration Pill */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 text-[#0A0A0A]">
            <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="text-[14px] font-bold tracking-tight">
              {formatRange(request.startDate, request.endDate)}
            </span>
          </div>

          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-[#FAFAF9] text-[#0A0A0A] border border-[#E5E5E3] tabular-nums">
            {request.workingDays} working day{request.workingDays === 1 ? "" : "s"}
            {request.isHalfDay && " · Half Day"}
          </span>
        </div>

        {/* Reason callout box */}
        {request.reason && (
          <div className="mt-3 p-3 rounded-xl bg-[#FAFAF9] border border-[#F2F2F0] text-[12px] text-[#4B4B4B] line-clamp-2 leading-relaxed">
            <span className="font-semibold text-[#0A0A0A]">Reason: </span>
            {request.reason}
          </div>
        )}
      </div>

      {/* Action Buttons Row */}
      {(onApprove || onReject || onCancel || onOpen) && (
        <div className="mt-4 pt-3 border-t border-[#F2F2F0] flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {onApprove && (
              <Button size="sm" variant="tenant" onClick={onApprove} className="rounded-xl font-bold">
                Approve
              </Button>
            )}
            {onReject && (
              <Button size="sm" variant="secondary" onClick={onReject} className="rounded-xl font-bold">
                Reject
              </Button>
            )}
            {onCancel && (
              <Button size="sm" variant="ghost" onClick={onCancel} className="rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold">
                Cancel request
              </Button>
            )}
          </div>

          {onOpen && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onOpen}
              className="rounded-xl font-bold text-[#0A0A0A] hover:bg-[#FAFAF9] group/btn"
            >
              Details
              <ArrowUpRight className="w-3.5 h-3.5 ml-1 text-[#8E8E8E] group-hover/btn:text-[#0A0A0A] transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

