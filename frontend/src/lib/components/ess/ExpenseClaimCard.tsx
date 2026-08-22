import { Badge, Button, Card } from "@/lib/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUS_LABELS,
  type ExpenseClaim,
  type ExpenseStatus,
} from "@/lib/types/ess";

const statusVariant: Record<ExpenseStatus, "default" | "warning" | "success" | "danger"> = {
  draft: "default",
  submitted: "warning",
  approved: "success",
  rejected: "danger",
  reimbursed: "success",
};

export interface ExpenseClaimCardProps {
  claim: ExpenseClaim;
  onSubmit?: () => void;
  onDelete?: () => void;
}

export function ExpenseClaimCard({ claim, onSubmit, onDelete }: ExpenseClaimCardProps) {
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-mono text-[#6B6B6B]">{claim.code}</span>
            <Badge variant={statusVariant[claim.status]}>{EXPENSE_STATUS_LABELS[claim.status]}</Badge>
          </div>
          <h3 className="mt-1.5 text-[15px] font-semibold text-[#0A0A0A]">{claim.title}</h3>
          <p className="text-[12px] text-[#6B6B6B] mt-0.5">
            {EXPENSE_CATEGORY_LABELS[claim.category]} · Spent on {formatDate(claim.spentOn)}
            {claim.receiptName ? ` · ${claim.receiptName}` : " · No receipt"}
          </p>
        </div>
        <p className="text-[18px] font-semibold tabular-nums">{formatCurrency(claim.amount)}</p>
      </div>
      {claim.description && <p className="text-[13px] text-[#3F3F46]">{claim.description}</p>}
      {claim.decisionNote && (
        <p className="text-[12px] text-[#B91C1C] bg-[#DC2626]/5 rounded-sm px-3 py-2">{claim.decisionNote}</p>
      )}
      {(onSubmit || onDelete) && claim.status === "draft" && (
        <div className="flex gap-2 pt-1 border-t border-[#F2F2F0]">
          {onSubmit && <Button size="sm" variant="primary" onClick={onSubmit}>Submit for approval</Button>}
          {onDelete && <Button size="sm" variant="ghost" onClick={onDelete}>Delete draft</Button>}
        </div>
      )}
    </Card>
  );
}