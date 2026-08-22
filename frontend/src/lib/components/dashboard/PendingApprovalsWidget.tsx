import { useState } from "react";
import { Avatar, Badge, EmptyState, ConfirmDialog } from "@/lib/components/ui";
import { showToast } from "@/lib/components/ui/Toast";
import { dashboardApi } from "@/lib/api/dashboard";
import type { PendingApproval } from "@/lib/types/dashboard";
import { Check, X, ArrowUpRight, Clock } from "lucide-react";

export function PendingApprovalsWidget({
  initial,
  onChange,
}: {
  initial: PendingApproval[];
  onChange?: (next: PendingApproval[]) => void;
}) {
  const [items, setItems] = useState(initial);
  const [confirm, setConfirm] = useState<{ id: string; decision: "approve" | "decline" } | null>(null);

  const visible = items.slice(0, 5);

  const submit = async () => {
    if (!confirm) return;
    const { id, decision } = confirm;
    await dashboardApi.resolveApproval(id, decision);
    const next = items.filter((a) => a.id !== id);
    setItems(next);
    onChange?.(next);
    showToast(decision === "approve" ? "Request approved" : "Request declined", decision === "approve" ? "success" : "info");
  };

  return (
    <div className="rounded-2xl border border-[#E5E5E3] bg-white p-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#F2F2F0] flex items-center justify-between bg-[#FAFAF9]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <div>
            <h3 className="text-[14px] font-bold text-[#0A0A0A] tracking-tight">Pending approvals</h3>
            <p className="text-[11px] text-[#8E8E8E] font-medium">Action required by manager</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => showToast("Leave module ships in Phase 5", "info")}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#0A0A0A] hover:text-orange-600 transition-colors group"
        >
          View all
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>

      {visible.length === 0 ? (
        <EmptyState title="All caught up!" subtitle="No pending approvals waiting for your action." />
      ) : (
        <ul className="divide-y divide-[#F4F4F2]">
          {visible.map((a) => (
            <li key={a.id} className="px-5 py-3.5 flex items-center gap-3.5 hover:bg-[#FAFAF9] transition-colors">
              <Avatar initials={a.employeeInitials} className="shrink-0 ring-2 ring-neutral-100" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-bold text-[#0A0A0A] truncate">{a.employeeName}</p>
                  <span className="inline-block text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                    {a.type}
                  </span>
                </div>
                <p className="text-[12px] text-[#6B6B6B] truncate mt-0.5">
                  {a.dateRange} — <span className="text-[#8E8E8E]">{a.reason}</span>
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirm({ id: a.id, decision: "approve" })}
                  aria-label={`Approve ${a.employeeName}`}
                  className="h-8 w-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center shadow-2xs"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirm({ id: a.id, decision: "decline" })}
                  aria-label={`Decline ${a.employeeName}`}
                  className="h-8 w-8 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center shadow-2xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.decision === "approve" ? "Approve request?" : "Decline request?"}
        description={
          confirm?.decision === "approve"
            ? "The employee will be notified immediately that their request has been approved."
            : "The employee will be notified that their request was declined."
        }
        confirmLabel={confirm?.decision === "approve" ? "Approve" : "Decline"}
        variant={confirm?.decision === "decline" ? "danger" : "default"}
        onConfirm={submit}
      />
    </div>
  );
}

