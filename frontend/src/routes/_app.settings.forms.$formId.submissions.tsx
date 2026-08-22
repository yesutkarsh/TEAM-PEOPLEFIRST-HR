import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Badge, Button, DataTable, EmptyState, SlideOver, Spinner, type ColumnDef } from "@/lib/components/ui";
import { showToast } from "@/lib/components/ui/Toast";
import { formsApi } from "@/lib/api/forms";
import { getLocalSubmissions } from "@/lib/utils/localStorage";
import type { CandidateSubmission } from "@/lib/types/candidate";
import type { FormSchema } from "@/lib/types/formSchema";

export const Route = createFileRoute("/_app/settings/forms/$formId/submissions")({
  component: FormSubmissionsPage,
  head: () => ({ meta: [{ title: "Form Submissions — Settings — HRMS" }] }),
});

function toCsv(schema: FormSchema, rows: CandidateSubmission[]): string {
  const fieldIds = schema.steps.flatMap((s) => s.fields.filter((f) => f.type !== "section_heading" && f.type !== "paragraph" && f.type !== "divider").map((f) => ({ id: f.id, label: f.label })));
  const header = ["Submission #", "Submitted at", ...fieldIds.map((f) => f.label)];
  const lines = rows.map((r) => [
    String(r.submissionNumber),
    r.submittedAt,
    ...fieldIds.map((f) => JSON.stringify(r.responses?.[f.id] ?? "").replace(/^"|"$/g, "")),
  ]);
  return [header, ...lines].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

function FormSubmissionsPage() {
  const { formId } = useParams({ from: "/_app/settings/forms/$formId/submissions" });
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CandidateSubmission | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const res = await formsApi.get(formId);
      if (res.error || !res.data) {
        showToast(res.error?.message ?? "Form not found.", "error");
      } else {
        setSchema(res.data);
      }
      setLoading(false);
    })();
  }, [formId]);

  const submissions = useMemo(() => {
    if (!schema) return [];
    return getLocalSubmissions()
      .filter((s) => !s.isDraft && s.formVersionId === schema.versionId)
      .sort((a, b) => b.submissionNumber - a.submissionNumber);
  }, [schema]);

  const exportCsv = () => {
    if (!schema) return;
    const csv = toCsv(schema, submissions);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${schema.title.replace(/\s+/g, "_")}_submissions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !schema) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={24} />
      </div>
    );
  }

  const columns: ColumnDef<CandidateSubmission>[] = [
    { key: "submissionNumber", label: "#", render: (r) => `#${r.submissionNumber}` },
    { key: "submittedAt", label: "Submitted", render: (r) => new Date(r.submittedAt).toLocaleString() },
    { key: "actions", label: "", align: "right", render: (r) => (
      <Button size="sm" variant="secondary" onClick={() => setSelected(r)}>View</Button>
    ) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <Link to="/settings/forms/$formId" params={{ formId }} className="text-[13px] text-[#6B6B6B] hover:text-[#0A0A0A]">← Back to builder</Link>
          <h2 className="text-[20px] font-semibold mt-1">{schema.title} — Submissions</h2>
        </div>
        <Button variant="secondary" onClick={exportCsv} disabled={submissions.length === 0}>Export CSV</Button>
      </div>
      <DataTable
        columns={columns}
        data={submissions}
        getRowKey={(s) => s.id}
        emptyState={<EmptyState title="No submissions yet." subtitle="Responses will appear here once candidates submit this form." />}
      />
      <SlideOver
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Submission #${selected.submissionNumber}` : ""}
      >
        {selected && (
          <div className="space-y-4">
            {schema.steps.flatMap((s) => s.fields).filter((f) => f.type !== "section_heading" && f.type !== "paragraph" && f.type !== "divider").map((f) => (
              <div key={f.id}>
                <p className="text-[12px] font-medium text-[#6B6B6B]">{f.label}</p>
                <p className="text-[14px] text-[#0A0A0A]">{JSON.stringify(selected.responses?.[f.id] ?? "—")}</p>
              </div>
            ))}
          </div>
        )}
      </SlideOver>
    </div>
  );
}
