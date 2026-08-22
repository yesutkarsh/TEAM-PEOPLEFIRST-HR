/** Earnings + deductions + employer contributions with the three headline totals. */
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import type { SalaryBreakup } from "@/lib/types/payroll";

function Row({ label, note, amount, notApplicable }: { label: string; note?: string; amount: number; notApplicable?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-[13px] text-[#0A0A0A]">
        {label}
        {note && <span className="ml-2 text-[12px] text-[#6B6B6B]">({note})</span>}
      </span>
      <span className={cn("text-[13px] tabular-nums font-medium", notApplicable && "text-[#6B6B6B] font-normal")}>
        {notApplicable ? "Not applicable" : formatCurrency(amount)}
      </span>
    </div>
  );
}

function Total({ label, amount, strong }: { label: string; amount: number; strong?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 border-t border-[#E5E5E3] pt-2 mt-1", strong && "border-[#0A0A0A]")}>
      <span className={cn("text-[13px]", strong ? "font-bold" : "font-semibold")}>{label}</span>
      <span className={cn("tabular-nums", strong ? "text-[20px] font-bold" : "text-[13px] font-semibold")}>{formatCurrency(amount)}</span>
    </div>
  );
}

function Label({ children }: { children: string }) {
  return <p className="mt-4 mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">{children}</p>;
}

export function SalaryBreakupTable({ breakup, className }: { breakup: SalaryBreakup; className?: string }) {
  return (
    <div className={cn("text-[13px]", className)}>
      <Label>Earnings</Label>
      {breakup.earnings.map((l) => (
        <Row key={l.componentId} label={l.component.name} note={l.note} amount={l.monthlyAmount} />
      ))}
      <Total label="Gross earnings" amount={breakup.grossEarnings} />

      <Label>Deductions (employee)</Label>
      {breakup.deductions.map((l) => (
        <Row key={l.componentId} label={l.component.name} note={l.note} amount={l.monthlyAmount} notApplicable={l.notApplicable} />
      ))}
      <Total label="Total deductions" amount={breakup.totalDeductions} />

      <div className="mt-4">
        <Total label="Net take-home (monthly)" amount={breakup.netPay} strong />
      </div>

      <Label>Employer contributions</Label>
      {breakup.employerContribs.map((l) => (
        <Row key={l.componentId} label={l.component.name} note={l.note} amount={l.monthlyAmount} notApplicable={l.notApplicable} />
      ))}
      <Total label="Total employer contribution" amount={breakup.totalEmployerContrib} />

      <div className="mt-4">
        <Total label="Total employer cost (monthly)" amount={breakup.totalCost} />
      </div>
    </div>
  );
}