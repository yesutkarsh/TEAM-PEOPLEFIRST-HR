import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button, EmptyState, Spinner } from "@/lib/components/ui";
import { AuditLogRow } from "@/lib/components/rbac";
import { listAuditLog } from "@/lib/api/rbac";
import type { PermissionAuditEntry } from "@/lib/types/rbac";

export const Route = createFileRoute("/_app/settings/roles/audit")({
  component: AuditPage,
  head: () => ({ meta: [{ title: "Access Audit Log — Settings — HRMS" }] }),
});

function AuditPage() {
  const [entries, setEntries] = useState<PermissionAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listAuditLog().then((r) => { if (r.data) setEntries(r.data); setLoading(false); });
  }, []);

  const exportCsv = () => {
    const rows = [
      ["Timestamp", "Actor", "Action", "Details"],
      ...entries.map((e) => [e.timestamp, e.actorName, e.action, e.details]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "permission-audit.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="secondary" onClick={exportCsv} disabled={entries.length === 0}>Export audit log</Button>
      </div>
      {entries.length === 0 ? (
        <EmptyState title="No audit entries yet" subtitle="Role changes and delegations will appear here." />
      ) : (
        <div className="rounded-md border border-[#E5E5E3] bg-white overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#FAFAF8] text-left text-[11px] uppercase text-[#6B6B6B]">
              <tr>
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => <AuditLogRow key={e.id} entry={e} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}