/** Compensation + payslips shown inside the employee profile. */
import { useEffect, useState } from "react";
import { ArrowUpRight, Banknote, Building2, CreditCard, DollarSign } from "lucide-react";
import { Card, EmptyState, Spinner } from "@/lib/components/ui";
import { payrollApi, maskAccount } from "@/lib/api/payroll";
import { formatCurrency } from "@/lib/utils/format";
import type { EmployeeSalary, Payslip } from "@/lib/types/payroll";
import type { Employee } from "@/lib/types/employee";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function EmployeeCompensationTab({ employee }: { employee: Employee }) {
  const [salary, setSalary] = useState<EmployeeSalary | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void Promise.all([
      payrollApi.getCurrentSalary(employee.id),
      payrollApi.listPayslips(employee.id),
    ]).then(([s, p]) => {
      if (!alive) return;
      setSalary(s.data ?? null);
      setPayslips(p.data ?? []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [employee.id]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E5E5E3] bg-white p-12 flex justify-center items-center">
        <Spinner />
      </div>
    );
  }

  const ctc = salary?.annualCtc ?? employee.ctcAnnual ?? 0;

  return (
    <div className="space-y-5">
      {/* Hero Bento CTC Card (Obsidian Dark) */}
      <div className="rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-800 border border-neutral-800 text-white p-6 sm:p-7 shadow-md relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-orange-400 mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              Annual Compensation Package (CTC)
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-[36px] sm:text-[48px] leading-none font-extrabold tracking-tight text-white font-sans tabular-nums">
                {ctc ? formatCurrency(ctc) : "—"}
              </span>
              <span className="text-xs font-semibold text-neutral-400">/ annum</span>
            </div>
            <p className="mt-2 text-[12px] text-neutral-400">
              Effective from: <span className="text-white font-medium">{salary?.effectiveFrom?.slice(0, 10) ?? "Current financial year"}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 shrink-0 bg-white/5 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Monthly Gross</p>
              <p className="text-[16px] font-bold text-white tabular-nums">{ctc ? formatCurrency(ctc / 12) : "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Pay Frequency</p>
              <p className="text-[16px] font-bold text-white">Monthly</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bank & Tax Details Card */}
      <div className="rounded-2xl border border-[#E5E5E3] bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-orange-600" />
          <h3 className="text-[14px] font-bold text-[#0A0A0A] tracking-tight">Disbursement & Tax Details</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[13px]">
          <div className="p-3 rounded-xl bg-[#FAFAF9] border border-[#F2F2F0]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8E8E8E]">Bank Name</p>
            <p className="mt-1 font-bold text-[#0A0A0A] truncate">{salary?.bankName ?? employee.bankName ?? "—"}</p>
          </div>
          <div className="p-3 rounded-xl bg-[#FAFAF9] border border-[#F2F2F0]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8E8E8E]">Account Number</p>
            <p className="mt-1 font-bold text-[#0A0A0A] tabular-nums truncate">
              {maskAccount(salary?.bankAccountNumber ?? employee.bankAccountNumber)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-[#FAFAF9] border border-[#F2F2F0]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8E8E8E]">IFSC Code</p>
            <p className="mt-1 font-bold text-[#0A0A0A] tabular-nums truncate">{salary?.bankIfsc ?? employee.bankIfsc ?? "—"}</p>
          </div>
          <div className="p-3 rounded-xl bg-[#FAFAF9] border border-[#F2F2F0]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8E8E8E]">PAN Number</p>
            <p className="mt-1 font-bold text-[#0A0A0A] tabular-nums truncate">{salary?.panNumber ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* Payslips List Widget */}
      <div className="rounded-2xl border border-[#E5E5E3] bg-white shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F2F2F0] flex items-center justify-between bg-[#FAFAF9]">
          <div className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-orange-600" />
            <h3 className="text-[14px] font-bold text-[#0A0A0A] tracking-tight">Generated Payslips</h3>
          </div>
          <span className="text-[11px] font-semibold text-[#8E8E8E] uppercase tracking-wider">
            {payslips.length} payslip{payslips.length === 1 ? "" : "s"}
          </span>
        </div>

        {payslips.length === 0 ? (
          <div className="p-8">
            <EmptyState title="No payslips yet" subtitle="Payslips appear here once a payroll run is finalised." />
          </div>
        ) : (
          <ul className="divide-y divide-[#F2F2F0]">
            {payslips.map((p) => (
              <li key={p.id} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-[#FAFAF9] transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 font-bold text-xs uppercase">
                    {MONTHS[p.month - 1]}
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#0A0A0A]">
                      {MONTHS[p.month - 1]} {p.year} Payslip
                    </p>
                    <p className="text-[12px] text-[#8E8E8E]">
                      Gross: <span className="font-medium text-[#404040] tabular-nums">{formatCurrency(p.grossEarnings)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[11px] uppercase font-semibold text-[#8E8E8E]">Net Pay</p>
                    <p className="text-[15px] font-bold text-emerald-600 tabular-nums">{formatCurrency(p.netPay)}</p>
                  </div>
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#FAFAF9] text-[#8E8E8E] border border-[#F2F2F0] group-hover:bg-[#0A0A0A] group-hover:text-white transition-colors">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

