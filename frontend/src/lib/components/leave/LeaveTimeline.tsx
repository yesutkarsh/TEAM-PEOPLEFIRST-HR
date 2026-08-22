import { CheckCircle2, Clock, XCircle } from "lucide-react";
import type { LeaveRequest } from "@/lib/types/leave";
import { cn } from "@/lib/utils";

function fmt(d: Date) {
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function LeaveTimeline({ request }: { request: LeaveRequest }) {
  type Step = { key: string; label: string; meta: string; state: "done" | "rejected" | "pending"; comment?: string };
  const steps: Step[] = [
    { key: "applied", label: "Request Submitted", meta: fmt(request.appliedAt), state: "done", comment: request.reason },
    ...request.approvals.map((a) => ({
      key: a.id,
      label: `${a.level === "manager" ? "Manager" : "HR Admin"} ${a.action === "approved" ? "Approved" : "Rejected"}`,
      meta: `${a.approverName} · ${fmt(a.actionAt)}`,
      state: (a.action === "approved" ? "done" : "rejected") as Step["state"],
      comment: a.comment,
    })),
  ];
  if (request.status === "pending") {
    steps.push({
      key: "awaiting",
      label: request.twoLevel && request.approvals.length === 1 ? "Awaiting HR Admin Approval" : "Awaiting Manager Approval",
      meta: "Pending Decision",
      state: "pending",
      comment: undefined,
    });
  }
  if (request.status === "cancelled") {
    steps.push({ key: "cancelled", label: "Cancelled by Employee", meta: request.cancelledAt ? fmt(request.cancelledAt) : "", state: "rejected", comment: request.cancelReason });
  }

  return (
    <div className="rounded-2xl border border-[#E5E5E3] bg-[#FAFAF9] p-5">
      <h3 className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-[#8E8E8E] mb-4">
        Approval Progress & Timeline
      </h3>

      <ol className="relative pl-6 space-y-6">
        {/* Connecting line */}
        <span className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-[#E5E5E3]" aria-hidden />

        {steps.map((s) => (
          <li key={s.key} className="relative flex items-start gap-3">
            {/* Step Icon Node */}
            <span
              className={cn(
                "absolute -left-6 top-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white ring-4 ring-[#FAFAF9] text-white shrink-0",
                s.state === "done" && "bg-emerald-600",
                s.state === "rejected" && "bg-rose-600",
                s.state === "pending" && "bg-amber-500 animate-pulse",
              )}
            >
              {s.state === "done" && <CheckCircle2 className="w-3.5 h-3.5" />}
              {s.state === "rejected" && <XCircle className="w-3.5 h-3.5" />}
              {s.state === "pending" && <Clock className="w-3.5 h-3.5" />}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <p className="text-[13px] font-bold text-[#0A0A0A] tracking-tight">{s.label}</p>
                <span className="text-[11px] font-semibold text-[#8E8E8E]">{s.meta}</span>
              </div>

              {s.comment && (
                <div className="mt-2 p-3 rounded-xl bg-white border border-[#E5E5E3] text-[12px] text-[#4B4B4B] shadow-2xs leading-relaxed">
                  <span className="font-semibold text-[#0A0A0A]">Note: </span>
                  {s.comment}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

