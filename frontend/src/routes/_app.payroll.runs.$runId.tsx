/** Payroll run detail — entries table, validation, adjustments, lifecycle actions, exports. */
import { useEffect, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/lib/components/layout";
import { Badge, Button, ConfirmDialog, DataTable, EmptyState, Spinner, showToast, type ColumnDef } from "@/lib/components/ui";
import { PermissionGuard } from "@/lib/components/rbac";
import { AdjustEntrySlideOver, PayrollRunStatusBadge, ValidationIssuesPanel } from "@/lib/components/payroll";
import { PayrollAnomalySection } from "@/lib/components/ai";
import { authStore } from "@/lib/store/auth";
import { downloadTextFile, payrollApi } from "@/lib/api/payroll";
import { formatCurrency } from "@/lib/utils/format";
import { monthLabel, type PayrollEntry, type PayrollRun } from "@/lib/types/payroll";

export const Route = createFileRoute("/_app/payroll/runs/$runId")({
  component: PayrollRunDetailPage,
  head: () => ({
    meta: [
      { title: "Payroll Run Detail — HRMS" },
      { name: "description", content: "Review employee entries, resolve validation issues, and progress a payroll run to payment." },
      { property: "og:title", content: "Payroll Run Detail — HRMS" },
      { property: "og:description", content: "Review employee entries, resolve validation issues, and progress a payroll run to payment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PayrollRunDetailPage() {
  const { runId } = useParams({ from: "/_app/payroll/runs/$runId" });
  const user = authStore.useSelector((s) => s.user);
  const actor = user?.fullName ?? "You";
  const [loading, setLoading] = useState(true);
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [adjustEntry, setAdjustEntry] = useState<PayrollEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const reload = () => {
    setLoading(true);
    void Promise.all([payrollApi.getRun(runId), payrollApi.listEntries(runId)]).then(([r, e]) => {
      setRun(r.data ?? null);
      setEntries(e.data ?? []);
      setLoading(false);
    });
  };
  useEffect(reload, [runId]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
  if (!run) return <EmptyState title="Payroll run not found" />;

  const moveToReview = async () => {
    setBusy(true);
    const res = await payrollApi.setRunStatus(runId, "in_review", actor);
    setBusy(false);
    if (res.error) return showToast(res.error.message, "error");
    showToast("Run moved to review.", "success");
    reload();
  };

  const approveAndFinalise = async () => {
    setBusy(true);
    const res = await payrollApi.finaliseRun(runId, actor);
    setBusy(false);
    if (res.error) return showToast(res.error.message, "error");
    showToast(`Finalised — ${res.data?.payslips ?? 0} pay slips generated.`, "success");
    reload();
  };

  const markPaid = async () => {
    setBusy(true);
    const res = await payrollApi.setRunStatus(runId, "paid", actor);
    setBusy(false);
    if (res.error) return showToast(res.error.message, "error");
    showToast("Payroll run marked as paid.", "success");
    reload();
  };

  const cancelRun = async () => {
    const res = await payrollApi.setRunStatus(runId, "cancelled", actor);
    if (res.error) return showToast(res.error.message, "error");
    showToast("Payroll run cancelled.", "info");
    reload();
  };

  const exportBankFile = async () => {
    const res = await payrollApi.bankFile(runId);
    if (res.error || !res.data) return showToast(res.error?.message ?? "Could not generate bank file.", "error");
    downloadTextFile(`NEFT-${monthLabel(run.month, run.year).replace(" ", "-")}.csv`, res.data.csv);
    showToast(`NEFT file downloaded — ${res.data.included} included, ${res.data.excluded} excluded.`, "success");
  };

  const exportStatutory = async (kind: "pf" | "esi") => {
    const res = await payrollApi.statutoryRegister(runId, kind);
    if (res.error || !res.data) return showToast(res.error?.message ?? "Could not generate register.", "error");
    downloadTextFile(`${kind.toUpperCase()}-Register-${monthLabel(run.month, run.year).replace(" ", "-")}.csv`, res.data);
    showToast(`${kind.toUpperCase()} statutory register downloaded.`, "success");
  };

  const saveAdjustment = async (patch: { earnings: PayrollEntry["earnings"]; deductions: PayrollEntry["deductions"]; lopDays: number; notes: string }) => {
    if (!adjustEntry) return;
    const res = await payrollApi.updateEntry(adjustEntry.id, patch);
    if (res.error) { showToast(res.error.message, "error"); return; }
    showToast("Entry adjusted.", "success");
    reload();
  };

  const columns: ColumnDef<PayrollEntry>[] = [
    {
      key: "employee",
      label: "Employee",
      render: (e) => (
        <div>
          <p className="font-medium">{e.employeeName}</p>
          <p className="text-[12px] text-[#6B6B6B]">{e.employeeCode} · {e.structureName}</p>
        </div>
      ),
    },
    { key: "lopDays", label: "LOP days", align: "right", render: (e) => e.lopDays },
    { key: "grossEarnings", label: "Gross", align: "right", render: (e) => formatCurrency(e.grossEarnings) },
    { key: "totalDeductions", label: "Deductions", align: "right", render: (e) => formatCurrency(e.totalDeductions) },
    { key: "netPay", label: "Net pay", align: "right", render: (e) => <span className="font-semibold">{formatCurrency(e.netPay)}</span> },
    {
      key: "flags",
      label: "Flags",
      render: (e) => (
        <div className="flex flex-wrap gap-1">
          {e.isManuallyEdited && <Badge variant="warning">Edited</Badge>}
          {e.flags.includes("prorated") && <Badge>Prorated</Badge>}
          {e.flags.includes("final_settlement") && <Badge variant="danger">Exit</Badge>}
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (e) => (
        <PermissionGuard permission="payroll.run">
          <Button size="sm" variant="ghost" disabled={run.status !== "draft" && run.status !== "in_review"} onClick={() => setAdjustEntry(e)}>
            Adjust
          </Button>
        </PermissionGuard>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Payroll run — ${monthLabel(run.month, run.year)}`}
        description={`Initiated by ${run.initiatedBy} on ${new Date(run.initiatedAt).toLocaleDateString()}.`}
        actions={<PayrollRunStatusBadge status={run.status} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-md border border-[#E5E5E3] bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Employees</p>
          <p className="mt-2 text-[22px] font-bold">{run.employeeCount}</p>
        </div>
        <div className="rounded-md border border-[#E5E5E3] bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Gross</p>
          <p className="mt-2 text-[22px] font-bold">{formatCurrency(run.totalGross)}</p>
        </div>
        <div className="rounded-md border border-[#E5E5E3] bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Deductions</p>
          <p className="mt-2 text-[22px] font-bold">{formatCurrency(run.totalDeductions)}</p>
        </div>
        <div className="rounded-md border border-[#E5E5E3] bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Net pay</p>
          <p className="mt-2 text-[22px] font-bold">{formatCurrency(run.totalNetPay)}</p>
        </div>
      </div>

      <PermissionGuard permission="payroll.run">
        <div className="flex flex-wrap items-center gap-2">
          {run.status === "draft" && (
            <Button variant="primary" onClick={moveToReview} loading={busy}>Move to review</Button>
          )}
          {run.status === "in_review" && (
            <Button variant="primary" onClick={approveAndFinalise} loading={busy}>Approve &amp; finalise</Button>
          )}
          {run.status === "finalised" && (
            <Button variant="primary" onClick={markPaid} loading={busy}>Mark as paid</Button>
          )}
          {(run.status === "draft" || run.status === "in_review") && (
            <Button variant="ghost" className="text-[#DC2626]" onClick={() => setCancelOpen(true)}>Cancel run</Button>
          )}
          <span className="w-px h-6 bg-[#E5E5E3]" aria-hidden />
          <Button variant="secondary" onClick={exportBankFile}>Export NEFT bank file</Button>
          <Button variant="secondary" onClick={() => exportStatutory("pf")}>PF register</Button>
          <Button variant="secondary" onClick={() => exportStatutory("esi")}>ESI register</Button>
        </div>
      </PermissionGuard>

      <ValidationIssuesPanel issues={run.validationIssues} />

      <PayrollAnomalySection runId={runId} />

      <DataTable
        columns={columns}
        data={entries}
        getRowKey={(e) => e.id}
        emptyState={<EmptyState title="No entries in this run" />}
      />

      <AdjustEntrySlideOver open={!!adjustEntry} entry={adjustEntry} onClose={() => setAdjustEntry(null)} onSave={saveAdjustment} />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this payroll run?"
        description="Employees will not be paid from this run. This action cannot be undone."
        confirmLabel="Cancel run"
        variant="danger"
        onConfirm={cancelRun}
      />

      <div>
        <Link to="/payroll/runs" className="text-[13px] text-[#6B6B6B] hover:text-[#0A0A0A]">← Back to payroll runs</Link>
      </div>
    </div>
  );
}
