import { DataTable } from "@/lib/components/ui";
import { EmptyState } from "@/lib/components/ui";
import type { ReportRow } from "@/lib/types/reports";

export function ReportTable({
  columns,
  rows,
  loading,
}: {
  columns: { key: string; label: string }[];
  rows: ReportRow[];
  loading?: boolean;
}) {
  return (
    <DataTable
      columns={columns.map((c) => ({ key: c.key, label: c.label }))}
      data={rows}
      loading={loading}
      getRowKey={(r) => JSON.stringify(r)}
      emptyState={<EmptyState title="No rows" subtitle="Adjust filters or fields to see results." />}
    />
  );
}
