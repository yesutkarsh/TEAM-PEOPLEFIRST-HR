/** Investment declaration form — 80C, 80D, HRA, LTA with totals and submit. */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/lib/components/layout";
import { Alert, Button, Card, Spinner, showToast } from "@/lib/components/ui";
import { DeclarationSectionCard } from "@/lib/components/payroll";
import { currentFinancialYear, payrollApi } from "@/lib/api/payroll";
import { listEmployees } from "@/lib/api/employees";
import { authStore } from "@/lib/store/auth";
import { formatCurrency } from "@/lib/utils/format";
import type { InvestmentDeclaration } from "@/lib/types/payroll";

export const Route = createFileRoute("/_app/payroll/declarations")({
  component: DeclarationsPage,
  head: () => ({
    meta: [
      { title: "Investment Declarations — HRMS" },
      { name: "description", content: "Declare your 80C, 80D, HRA and LTA investments for the current financial year." },
      { property: "og:title", content: "Investment Declarations — HRMS" },
      { property: "og:description", content: "Declare your 80C, 80D, HRA and LTA investments for the current financial year." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function DeclarationsPage() {
  const user = authStore.useSelector((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dec, setDec] = useState<InvestmentDeclaration | null>(null);

  const fy = currentFinancialYear();

  useEffect(() => {
    let alive = true;
    void (async () => {
      const emps = await listEmployees();
      const me = emps.data?.find((e) => e.workEmail === user?.email) ?? emps.data?.[0];
      if (!me) { if (alive) setLoading(false); return; }
      const res = await payrollApi.getDeclaration(me.id, fy);
      if (!alive) return;
      setDec(res.data ?? null);
      setLoading(false);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
  if (!dec) return <Alert variant="error">Could not load your investment declaration.</Alert>;

  const readOnly = dec.status !== "draft";
  const totalDeclared = dec.sections.reduce((n, s) => n + Math.min(s.total, s.maxLimit), 0);

  const setItemAmount = (sectionCode: string, itemId: string, amount: number | null) => {
    setDec((prev) => {
      if (!prev) return prev;
      const sections = prev.sections.map((s) =>
        s.code === sectionCode
          ? { ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, amount: amount ?? 0 } : i)) }
          : s,
      );
      return { ...prev, sections };
    });
  };

  const save = async () => {
    if (!dec) return;
    setSaving(true);
    const res = await payrollApi.saveDeclaration(dec);
    setSaving(false);
    if (res.error) return showToast(res.error.message, "error");
    setDec(res.data ?? dec);
    showToast("Declaration saved as draft.", "success");
  };

  const submit = async () => {
    if (!dec) return;
    setSaving(true);
    const savedRes = await payrollApi.saveDeclaration(dec);
    if (savedRes.error || !savedRes.data) { setSaving(false); return showToast(savedRes.error?.message ?? "Could not save.", "error"); }
    const res = await payrollApi.submitDeclaration(savedRes.data.id);
    setSaving(false);
    if (res.error) return showToast(res.error.message, "error");
    setDec(res.data ?? savedRes.data);
    showToast("Investment declaration submitted.", "success");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investment declarations"
        description={`Financial year ${dec.financialYear}. Declare your tax-saving investments to compute TDS accurately.`}
      />

      {readOnly && (
        <Alert variant="success" title={dec.status === "approved" ? "Approved" : "Submitted"}>
          Your declaration for {fy} has been {dec.status}. Contact HR to make further changes.
        </Alert>
      )}

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Total declared</p>
          <p className="mt-1 text-[24px] font-bold">{formatCurrency(totalDeclared)}</p>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={save} loading={saving}>Save draft</Button>
            <Button variant="primary" onClick={submit} loading={saving}>Submit declaration</Button>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dec.sections.map((s) => (
          <DeclarationSectionCard
            key={s.code}
            section={s}
            readOnly={readOnly}
            onItemChange={(itemId, amount) => setItemAmount(s.code, itemId, amount)}
          />
        ))}
      </div>
    </div>
  );
}
