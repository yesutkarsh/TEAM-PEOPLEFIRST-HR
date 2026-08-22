/** New expense claim. */
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/lib/components/layout";
import { Alert, Button, Card, CurrencyInput, DatePicker, FileUpload, Input, Select, Textarea, showToast } from "@/lib/components/ui";
import { essApi } from "@/lib/api/ess";
import { authStore } from "@/lib/store/auth";
import { useCurrentEmployee } from "@/lib/hooks/useCurrentEmployee";
import { EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from "@/lib/types/ess";

export const Route = createFileRoute("/_app/expenses/new")({
  component: NewExpensePage,
  head: () => ({
    meta: [
      { title: "New Expense Claim — HRMS" },
      { name: "description", content: "Submit a new work expense claim with receipt and amount." },
      { property: "og:title", content: "New Expense Claim — HRMS" },
      { property: "og:description", content: "Submit a new work expense claim with receipt and amount." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function NewExpensePage() {
  const navigate = useNavigate();
  const user = authStore.useSelector((s) => s.user);
  const { employee } = useCurrentEmployee();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("travel");
  const [amount, setAmount] = useState<number | null>(null);
  const [spentOn, setSpentOn] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<{ name: string; sizeKB: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (submit: boolean) => {
    setBusy(true);
    setError(null);
    const res = await essApi.createExpense({
      title, category, amount, spentOn, description,
      receiptName: file?.name,
      employeeId: employee?.id ?? "",
      employeeName: user?.fullName ?? "You",
      submit,
    });
    setBusy(false);
    if (res.error) return setError(res.error.message);
    showToast(submit ? `Claim ${res.data?.code} submitted.` : "Draft saved.", "success");
    navigate({ to: "/expenses" });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="New expense claim" description="Attach a receipt so approvals move faster." />
      {error && <Alert variant="error" title="Could not save">{error}</Alert>}
      <Card className="space-y-5">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Client visit — cab fare" />
        <Select
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          options={(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((c) => ({ value: c, label: EXPENSE_CATEGORY_LABELS[c] }))}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CurrencyInput label="Amount" value={amount} onChange={setAmount} />
          <DatePicker label="Spent on" value={spentOn} onChange={setSpentOn} maxDate={new Date().toISOString().slice(0, 10)} />
        </div>
        <Textarea label="Notes (optional)" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        <FileUpload
          label="Receipt (optional)"
          currentFile={file}
          onFileSelect={(f) => setFile({ name: f.name, sizeKB: Math.round(f.size / 1024) })}
          onFileRemove={() => setFile(null)}
        />
        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="primary" loading={busy} onClick={() => void save(true)}>Submit claim</Button>
          <Button variant="secondary" onClick={() => void save(false)}>Save as draft</Button>
          <Button variant="ghost" onClick={() => navigate({ to: "/expenses" })}>Cancel</Button>
        </div>
      </Card>
    </div>
  );
}