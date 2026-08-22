import { EmptyState } from "@/lib/components/ui";
import type { LeaveBalance } from "@/lib/types/leave";
import { LeaveBalanceCard } from "./LeaveBalanceCard";

export function LeaveBalanceGrid({
  balances,
  onApply,
}: {
  balances: LeaveBalance[];
  onApply?: (leaveTypeId: string) => void;
}) {
  if (!balances.length) {
    return (
      <div className="rounded-2xl border border-[#E5E5E3] bg-white p-8">
        <EmptyState
          title="No leave allocated yet."
          subtitle="Your HR team hasn't assigned a leave policy to you."
        />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {balances.map((b) => (
        <LeaveBalanceCard
          key={b.leaveTypeId}
          balance={b}
          onApply={onApply ? () => onApply(b.leaveTypeId) : undefined}
        />
      ))}
    </div>
  );
}

