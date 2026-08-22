/** Tenant list with search, status filter, sort, pagination. */
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { DataTable, type ColumnDef, type SortDirection, Input, Select, EmptyState, ConfirmDialog } from "@/lib/components/ui";
import { TenantStatusBadge } from "./TenantStatusBadge";
import { TenantActionMenu } from "./TenantActionMenu";
import { showToast } from "@/lib/components/ui/Toast";
import { adminApi } from "@/lib/api/admin";
import { impersonationStateStore } from "@/lib/store/auth";
import type { TenantStatus, TenantSummary } from "@/lib/types/admin";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "trial", label: "Trial" },
  { value: "suspended", label: "Suspended" },
  { value: "churned", label: "Churned" },
];

export function TenantTable({ data, loading, onChange }: { data: TenantSummary[]; loading?: boolean; onChange: () => void }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sortKey, setSortKey] = useState<string>("joinedAt");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [pendingAction, setPendingAction] = useState<{ kind: "suspend" | "delete"; tenant: TenantSummary } | null>(null);

  const filtered = useMemo(() => {
    let list = data;
    if (status !== "all") list = list.filter((t) => t.status === status);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) => t.companyName.toLowerCase().includes(q) || t.industry.toLowerCase().includes(q));
    }
    if (sortKey && sortDir) {
      list = [...list].sort((a, b) => {
        const av = a[sortKey as keyof TenantSummary] as string | number | undefined;
        const bv = b[sortKey as keyof TenantSummary] as string | number | undefined;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [data, status, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(start, start + PAGE_SIZE);

  const impersonate = (t: TenantSummary) => {
    impersonationStateStore.start(t.id, t.companyName);
    showToast(`Now viewing as ${t.companyName}`, "warning");
    navigate({ to: "/dashboard" });
  };

  const columns: ColumnDef<TenantSummary>[] = [
    { key: "companyName", label: "Company", sortable: true, render: (r) => (
      <button
        type="button"
        onClick={() => navigate({ to: "/admin/tenants/$tenantId", params: { tenantId: r.id } })}
        className="font-medium text-[#0A0A0A] hover:underline underline-offset-4"
      >
        {r.companyName}
      </button>
    ) },
    { key: "industry", label: "Industry", render: (r) => <span className="text-[#6B6B6B]">{r.industry}</span> },
    { key: "employees", label: "Employees", sortable: true, align: "right", render: (r) => r.employees.toLocaleString() },
    { key: "plan", label: "Plan", render: (r) => <span className="text-[#6B6B6B]">{r.plan}</span> },
    { key: "status", label: "Status", render: (r) => <TenantStatusBadge status={r.status} /> },
    { key: "joinedAt", label: "Joined", sortable: true, render: (r) => new Date(r.joinedAt).toLocaleDateString() },
    { key: "actions", label: "", render: (r) => (
      <TenantActionMenu actions={[
        { label: "View details", onClick: () => navigate({ to: "/admin/tenants/$tenantId", params: { tenantId: r.id } }) },
        { label: "Impersonate", onClick: () => impersonate(r) },
        { label: r.status === "suspended" ? "Activate" : "Suspend", onClick: () => setPendingAction({ kind: "suspend", tenant: r }) },
        { label: "Delete", destructive: true, onClick: () => setPendingAction({ kind: "delete", tenant: r }) },
      ]} />
    ), align: "right" },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <Input placeholder="Search by company or industry…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="sm:w-48">
          <Select options={STATUS_OPTIONS} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} />
        </div>
      </div>
      <DataTable
        columns={columns}
        data={paginated}
        loading={loading}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(k, d) => { setSortKey(k); setSortDir(d); }}
        getRowKey={(r) => r.id}
        emptyState={<EmptyState title="No tenants match" subtitle="Try clearing your filters." />}
      />
      <div className="mt-4 flex items-center justify-between text-[13px] text-[#6B6B6B]">
        <span>
          Showing {filtered.length === 0 ? 0 : start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-sm border border-[#E5E5E3] px-3 py-1 disabled:opacity-40 hover:bg-[#F2F2F0]"
          >
            Previous
          </button>
          <span>Page {safePage} of {totalPages}</span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-sm border border-[#E5E5E3] px-3 py-1 disabled:opacity-40 hover:bg-[#F2F2F0]"
          >
            Next
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={!!pendingAction}
        onOpenChange={(o) => !o && setPendingAction(null)}
        title={pendingAction?.kind === "delete" ? "Delete tenant?" : pendingAction?.tenant.status === "suspended" ? "Reactivate tenant?" : "Suspend tenant?"}
        description={pendingAction?.kind === "delete"
          ? `Delete ${pendingAction.tenant.companyName} permanently. This cannot be undone.`
          : pendingAction?.tenant.status === "suspended"
          ? `${pendingAction.tenant.companyName} will regain access to the platform.`
          : `${pendingAction?.tenant.companyName} will lose access until reactivated.`}
        confirmLabel={pendingAction?.kind === "delete" ? "Delete" : pendingAction?.tenant.status === "suspended" ? "Reactivate" : "Suspend"}
        variant={pendingAction?.kind === "delete" ? "danger" : "warning"}
        onConfirm={async () => {
          if (!pendingAction) return;
          if (pendingAction.kind === "delete") {
            await adminApi.deleteTenant(pendingAction.tenant.id);
            showToast(`${pendingAction.tenant.companyName} deleted`, "success");
          } else {
            const newStatus: TenantStatus = pendingAction.tenant.status === "suspended" ? "active" : "suspended";
            await adminApi.setStatus(pendingAction.tenant.id, newStatus);
            showToast(`Status updated to ${newStatus}`, "success");
          }
          onChange();
        }}
      />
    </div>
  );
}
