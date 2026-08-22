/** My payslips — list + detail breakup, print/download. */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/lib/components/layout";
import { Button, Card, EmptyState, Spinner } from "@/lib/components/ui";
import { SalaryBreakupTable } from "@/lib/components/payroll";
import { payrollApi } from "@/lib/api/payroll";
import { listEmployees } from "@/lib/api/employees";
import { authStore } from "@/lib/store/auth";
import { formatCurrency } from "@/lib/utils/format";
import { monthLabel, type Payslip, type SalaryBreakup } from "@/lib/types/payroll";

export const Route = createFileRoute("/_app/payroll/payslips")({
  component: PayslipsPage,
  head: () => ({
    meta: [
      { title: "My Payslips — HRMS" },
      { name: "description", content: "View and download your monthly pay slips with a full salary breakup." },
      { property: "og:title", content: "My Payslips — HRMS" },
      { property: "og:description", content: "View and download your monthly pay slips with a full salary breakup." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function toBreakup(p: Payslip): SalaryBreakup {
  const line = (l: Payslip["earnings"][number]) => ({
    componentId: l.componentId,
    component: { id: l.componentId, name: l.componentName, code: l.componentCode, type: "earning" as const, calculationMethod: "fixed" as const, taxable: true, isActive: true, isSystemDefined: false, displayOrder: 0 },
    monthlyAmount: l.amount,
    annualAmount: l.amount * 12,
    note: l.note,
  });
  return {
    earnings: p.earnings.map(line),
    deductions: p.deductions.map(line),
    employerContribs: p.employerContribs.map(line),
    grossEarnings: p.grossEarnings,
    totalDeductions: p.totalDeductions,
    netPay: p.netPay,
    totalEmployerContrib: p.employerContribs.reduce((n, l) => n + l.amount, 0),
    totalCost: p.grossEarnings + p.employerContribs.reduce((n, l) => n + l.amount, 0),
    monthlyCtc: 0,
    unallocated: 0,
  };
}

function PayslipsPage() {
  const user = authStore.useSelector((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selected, setSelected] = useState<Payslip | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const emps = await listEmployees();
      const me = emps.data?.find((e) => e.workEmail === user?.email) ?? emps.data?.[0];
      if (!me) { if (alive) setLoading(false); return; }
      const res = await payrollApi.listPayslips(me.id);
      if (!alive) return;
      setPayslips(res.data ?? []);
      setSelected(res.data?.[0] ?? null);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user?.email]);

  const download = () => {
    if (!selected) return;
    window.print();
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="My payslips" description="Pay slips are generated automatically when a payroll run is finalised." />
      {payslips.length === 0 ? (
        <EmptyState title="No pay slips yet" subtitle="Your pay slips will appear here once a payroll run has been finalised." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card padded={false} className="p-0 overflow-hidden md:col-span-1 h-fit">
            <div className="px-4 py-3 border-b border-[#E5E5E3]">
              <h2 className="text-[14px] font-semibold">All pay slips</h2>
            </div>
            <div>
              {payslips.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={`w-full text-left px-4 py-3 border-b border-[#F2F2F0] last:border-0 hover:bg-[#FAFAF8] transition-colors ${selected?.id === p.id ? "bg-[#FAFAF8]" : ""}`}
                >
                  <p className="text-[13px] font-medium">{monthLabel(p.month, p.year)}</p>
                  <p className="text-[12px] text-[#6B6B6B]">Net pay {formatCurrency(p.netPay)}</p>
                </button>
              ))}
            </div>
          </Card>
          <div className="md:col-span-2">
            {selected && (
              <Card>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-[18px] font-semibold">{monthLabel(selected.month, selected.year)}</h2>
                    <p className="text-[13px] text-[#6B6B6B]">{selected.employeeName} · {selected.employeeCode}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={download}>Print / Download</Button>
                </div>
                <SalaryBreakupTable breakup={toBreakup(selected)} />
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
