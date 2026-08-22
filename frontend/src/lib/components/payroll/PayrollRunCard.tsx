import { Link } from "@tanstack/react-router";
import { Button, Card } from "@/lib/components/ui";
import { formatCurrency } from "@/lib/utils/format";
import { monthLabel, type PayrollRun } from "@/lib/types/payroll";
import { PayrollRunStatusBadge } from "./PayrollRunStatusBadge";

export function PayrollRunCard({ run }: { run: PayrollRun }) {
  const errorCount = run.validationIssues.filter((i) => i.severity === "error").length;
  return (
    <Card className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[16px] font-semibold text-[#0A0A0A]">{monthLabel(run.month, run.year)}</h3>
          <PayrollRunStatusBadge status={run.status} />
          {errorCount > 0 && <span className="text-[12px] text-[#B91C1C]">{errorCount} error(s)</span>}
        </div>
        <p className="mt-1 text-[13px] text-[#6B6B6B]">
          {run.employeeCount} employees · Gross {formatCurrency(run.totalGross)} · Net {formatCurrency(run.totalNetPay)}
        </p>
      </div>
      <Link to="/payroll/runs/$runId" params={{ runId: run.id }}>
        <Button size="sm" variant="secondary">View run</Button>
      </Link>
    </Card>
  );
}
