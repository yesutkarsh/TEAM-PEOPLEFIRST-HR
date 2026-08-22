import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Breadcrumb,
  Button,
  Badge,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Input,
  MultiSelect,
  showToast,
  type ColumnDef,
} from "@/lib/components/ui";
import { CandidateStatusBadge, RejectionDialog } from "@/lib/components/candidates";
import { reviewApi } from "@/lib/api/candidates";
import { listEmployees } from "@/lib/api/employees";
import type { Employee } from "@/lib/types/employee";
import { Select } from "@/lib/components/ui";
import { candidatesApi } from "@/lib/api/candidates";
import { seedDemoCandidates } from "@/lib/api/seedCandidates";
import {
  CANDIDATE_STATUS_LABELS,
  TERMINAL_STATUSES,
  type CandidatePipelineStatus,
  type CandidateRow,
} from "@/lib/types/candidate";
import { PermissionGuard } from "@/lib/components/rbac";

export const Route = createFileRoute("/_app/candidates/")({
  component: CandidatesPage,
  head: () => ({ meta: [{ title: "Candidates — HRMS" }] }),
});

function initials(first: string, last: string) {
  return (first[0] ?? "?") + (last[0] ?? "");
}

function CandidatesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [role, setRole] = useState("");
  const [resendTarget, setResendTarget] = useState<CandidateRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<CandidateRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<CandidateRow | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bulkReviewer, setBulkReviewer] = useState("");

  const load = async () => {
    setLoading(true);
    seedDemoCandidates();
    const r = await candidatesApi.list();
    if (r.data) setRows(r.data);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    void listEmployees({}).then((r) => setEmployees(r.data ?? []));
  }, []);

  const selectableRow = (row: CandidateRow) => !TERMINAL_STATUSES.includes(row.pipeline.status);

  const bulkAssign = async () => {
    const emp = employees.find((e) => e.id === bulkReviewer);
    if (!emp || selected.length === 0) return;
    const r = await reviewApi.bulkAssignReviewer(selected, { id: emp.id, name: `${emp.firstName} ${emp.lastName}` });
    if (r.data) {
      showToast(
        `${r.data.processed} assigned${r.data.skipped ? `, ${r.data.skipped} skipped (already assigned)` : ""}.`,
        "success",
      );
      setSelected([]);
      setBulkReviewer("");
      void load();
    }
  };

  const filtered = useMemo(() => {
    return rows.filter(({ candidate, pipeline }) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const name = `${candidate.firstName} ${candidate.lastName}`.toLowerCase();
        if (!name.includes(q) && !candidate.email.toLowerCase().includes(q)) return false;
      }
      if (statuses.length && !statuses.includes(pipeline.status)) return false;
      if (role.trim() && !(pipeline.roleName ?? "").toLowerCase().includes(role.trim().toLowerCase())) return false;
      return true;
    });
  }, [rows, search, statuses, role]);

  const hasFilters = !!search.trim() || statuses.length > 0 || !!role.trim();

  const resend = async (row: CandidateRow) => {
    const r = await candidatesApi.resendInvitation(row.pipeline.id);
    if (r.data) {
      showToast(`New link: ${r.data.magicLinkUrl}`, "success");
      void load();
    }
  };

  const cancel = async (row: CandidateRow) => {
    const r = await candidatesApi.withdraw(row.pipeline.id);
    if (r.data) {
      showToast("Pipeline cancelled", "success");
      void load();
    }
  };

  const reject = async (row: CandidateRow) => {
    const r = await candidatesApi.reject(row.pipeline.id, "Rejected from candidate list");
    if (r.data) {
      showToast("Candidate rejected", "success");
      void load();
    }
  };

  const columns: ColumnDef<CandidateRow>[] = [
    {
      key: "name",
      label: "Name",
      render: ({ candidate }) => (
        <div className="flex items-center gap-3">
          <span
            className="h-8 w-8 rounded-full inline-flex items-center justify-center font-semibold uppercase text-[12px] shrink-0"
            style={{ background: "var(--tenant-secondary)", color: "var(--tenant-text-on-secondary)" }}
          >
            {initials(candidate.firstName, candidate.lastName)}
          </span>
          <p className="font-medium text-[14px] truncate">{candidate.firstName} {candidate.lastName}</p>
        </div>
      ),
    },
    { key: "email", label: "Email", render: ({ candidate }) => candidate.email },
    { key: "role", label: "Role", render: ({ pipeline }) => pipeline.roleName ?? "—" },
    { key: "status", label: "Status", render: ({ pipeline }) => <CandidateStatusBadge status={pipeline.status} size="sm" /> },
    { key: "invited", label: "Invited", render: ({ pipeline }) => new Date(pipeline.invitedAt).toLocaleDateString() },
    { key: "activity", label: "Last activity", render: ({ pipeline }) => new Date(pipeline.lastActivityAt).toLocaleDateString() },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => {
        const { pipeline } = row;
        const canResend = pipeline.status === "invited" || pipeline.status === "expired";
        const canReject = ["submitted", "changes_requested", "approved"].includes(pipeline.status);
        const canCancel = !TERMINAL_STATUSES.includes(pipeline.status);
        return (
          <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
            <Link
              to="/candidates/$candidateId"
      search={{ tab: "overview" as const }}
              params={{ candidateId: row.candidate.id }}
              className="text-[12px] text-[var(--tenant-primary)] hover:underline"
            >
              View
            </Link>
            {canResend && (
              <button type="button" className="text-[12px] text-[#0A0A0A] hover:underline" onClick={() => setResendTarget(row)}>
                Resend
              </button>
            )}
            {canReject && (
              <button type="button" className="text-[12px] text-[#DC2626] hover:underline" onClick={() => setRejectTarget(row)}>
                Reject
              </button>
            )}
            {canCancel && (
              <button type="button" className="text-[12px] text-[#6B6B6B] hover:underline" onClick={() => setCancelTarget(row)}>
                Cancel
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Candidates" }]} />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-[28px] font-bold tracking-[-0.02em]">Candidates</h1>
          <Badge variant="default">{rows.length}</Badge>
        </div>
        <PermissionGuard permission="employees.create">
          <Button variant="primary" onClick={() => navigate({ to: "/candidates/invite" })}>Invite candidate</Button>
        </PermissionGuard>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <MultiSelect
          placeholder="Filter by status"
          value={statuses}
          onChange={setStatuses}
          options={Object.entries(CANDIDATE_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <Input placeholder="Filter by role…" value={role} onChange={(e) => setRole(e.target.value)} />
      </div>

      {selected.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap rounded-md border border-[#E5E5E3] bg-[#FAFAF8] px-4 py-3">
          <p className="text-[13px] font-medium text-[#0A0A0A]">{selected.length} selected</p>
          <PermissionGuard permission="employees.edit">
            <div className="flex items-center gap-2">
              <Select
                className="min-w-[220px]"
                value={bulkReviewer}
                onChange={(e) => setBulkReviewer(e.target.value)}
                options={[
                  { value: "", label: "Assign reviewer…" },
                  ...employees.map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName}` })),
                ]}
              />
              <Button size="sm" variant="secondary" disabled={!bulkReviewer} onClick={bulkAssign}>Assign</Button>
            </div>
            <Button size="sm" variant="danger" onClick={() => setBulkRejectOpen(true)}>Reject selected</Button>
          </PermissionGuard>
          <button type="button" className="text-[12px] text-[#6B6B6B] hover:underline ml-auto" onClick={() => setSelected([])}>
            Clear selection
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filtered}
        selectable
        selectedKeys={selected}
        onSelectionChange={setSelected}
        isRowSelectable={selectableRow}
        loading={loading}
        getRowKey={(r) => r.pipeline.id}
        emptyState={
          <EmptyState
            title={hasFilters ? "No candidates match your filters" : "No candidates yet. Invite your first candidate."}
            action={
              hasFilters ? (
                <Button variant="secondary" onClick={() => { setSearch(""); setStatuses([]); setRole(""); }}>Clear filters</Button>
              ) : (
                <Button onClick={() => navigate({ to: "/candidates/invite" })}>Invite candidate</Button>
              )
            }
          />
        }
      />

      <RejectionDialog
        open={bulkRejectOpen}
        onClose={() => setBulkRejectOpen(false)}
        pipelineIds={selected}
        onDone={(summary) => {
          showToast(
            summary
              ? `${summary.processed} rejected${summary.skipped ? `, ${summary.skipped} skipped` : ""}.`
              : "Candidate rejected.",
            "success",
          );
          setSelected([]);
          void load();
        }}
      />

      <ConfirmDialog
        open={!!resendTarget}
        onOpenChange={(o) => !o && setResendTarget(null)}
        title="Resend invitation?"
        description={`A new magic link will be generated for ${resendTarget?.candidate.firstName ?? "this candidate"}.`}
        confirmLabel="Resend"
        onConfirm={async () => { if (resendTarget) await resend(resendTarget); }}
      />
      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title="Cancel this pipeline?"
        description="The candidate will no longer be able to complete their application."
        confirmLabel="Cancel pipeline"
        variant="danger"
        onConfirm={async () => { if (cancelTarget) await cancel(cancelTarget); }}
      />
      <ConfirmDialog
        open={!!rejectTarget}
        onOpenChange={(o) => !o && setRejectTarget(null)}
        title="Reject this candidate?"
        description="This action is final and the candidate will be notified."
        confirmLabel="Reject"
        variant="danger"
        onConfirm={async () => { if (rejectTarget) await reject(rejectTarget); }}
      />
    </div>
  );
}
