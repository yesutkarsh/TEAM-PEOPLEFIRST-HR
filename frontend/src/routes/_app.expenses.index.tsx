/** Expense claims — list, submit drafts, delete. */
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/lib/components/layout";
import { Button, EmptyState, Spinner, StatCard, showToast } from "@/lib/components/ui";
import { ExpenseClaimCard } from "@/lib/components/ess";
import { essApi } from "@/lib/api/ess";
import { formatCurrency } from "@/lib/utils/format";
import type { ExpenseClaim } from "@/lib/types/ess";

export const Route = createFileRoute("/_app/expenses/")({
  component: ExpensesPage,
  head: () => ({
    meta: [
      { title: "My Expenses — HRMS" },
      { name: "description", content: "Submit expense claims and track reimbursement status." },
      { property: "og:title", content: "My Expenses — HRMS" },
      { property: "og:description", content: "Submit expense claims and track reimbursement status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ExpensesPage() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void essApi.listExpenses().then((r) => {
      setClaims(r.data ?? []);
      setLoading(false);
    });
  }, []);

  const pending = claims.filter((c) => c.status === "submitted");
  const reimbursed = claims.filter((c) => c.status === "reimbursed");

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My expenses"
        description="Claim work expenses and follow them through to reimbursement."
        actions={<Button variant="primary" onClick={() => navigate({ to: "/expenses/new" })}>New claim</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Awaiting approval" value={formatCurrency(pending.reduce((n, c) => n + c.amount, 0))} accent="tenant" />
        <StatCard label="Reimbursed to date" value={formatCurrency(reimbursed.reduce((n, c) => n + c.amount, 0))} />
        <StatCard label="Total claims" value={claims.length} />
      </div>

      {claims.length === 0 ? (
        <EmptyState
          title="No expense claims yet"
          subtitle="Create a claim and attach your receipt to get reimbursed."
          action={<Button variant="primary" onClick={() => navigate({ to: "/expenses/new" })}>New claim</Button>}
        />
      ) : (
        <div className="space-y-3 max-w-3xl">
          {claims.map((c) => (
            <ExpenseClaimCard
              key={c.id}
              claim={c}
              onSubmit={() => void essApi.submitExpense(c.id).then((r) => { setClaims(r.data ?? []); showToast("Claim submitted.", "success"); })}
              onDelete={() => void essApi.deleteExpense(c.id).then((r) => { setClaims(r.data ?? []); showToast("Draft deleted.", "info"); })}
            />
          ))}
        </div>
      )}
    </div>
  );
}