/** Custom report builder: pick data source, fields, filters, grouping, sort, preview, save. */
import { useEffect, useState } from "react";
import { Select, Button, Input, Textarea, ConfirmDialog, showToast } from "@/lib/components/ui";
import { Plus, Save } from "lucide-react";
import {
  DATA_SOURCE_LABELS,
  fieldsForDataSource,
  filterFieldsForDataSource,
  runCustomReport,
  saveReport,
  updateReport,
} from "@/lib/api/reports";
import type { CustomReportConfig, ReportDataSource, ReportFilter, ReportRow, SavedReport } from "@/lib/types/reports";
import { ReportFieldPicker } from "./ReportFieldPicker";
import { ReportFilterRow } from "./ReportFilterRow";
import { ReportTable } from "./ReportTable";
import { ReportExportMenu } from "./ReportExportMenu";

const DATA_SOURCES: ReportDataSource[] = ["employees", "leave", "attendance", "performance", "helpdesk", "expenses"];

function emptyConfig(source: ReportDataSource): CustomReportConfig {
  return { dataSource: source, fields: fieldsForDataSource(source).map((f) => f.key), filters: [] };
}

export function CustomReportBuilder({ initial }: { initial?: SavedReport }) {
  const [config, setConfig] = useState<CustomReportConfig>(initial?.config ?? emptyConfig("employees"));
  const [pendingSource, setPendingSource] = useState<ReportDataSource | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [preview, setPreview] = useState<{ columns: { key: string; label: string }[]; rows: ReportRow[] }>({ columns: [], rows: [] });
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Pick up a draft config generated from the NL bar, if any.
    if (initial) return;
    try {
      const raw = window.sessionStorage.getItem("hrms.reports.nlDraft");
      if (raw) {
        const parsed = JSON.parse(raw) as CustomReportConfig;
        setConfig(parsed);
        window.sessionStorage.removeItem("hrms.reports.nlDraft");
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLoadingPreview(true);
    void runCustomReport(config).then((r) => {
      setPreview(r.data ?? { columns: [], rows: [] });
      setLoadingPreview(false);
    });
  }, [config]);

  const fields = fieldsForDataSource(config.dataSource);
  const filterFields = filterFieldsForDataSource(config.dataSource);

  const hasConfig = config.fields.length > 0 || config.filters.length > 0 || !!config.groupBy || !!config.sortBy;

  const changeSource = (source: ReportDataSource) => {
    if (source === config.dataSource) return;
    if (hasConfig) {
      setPendingSource(source);
      setConfirmOpen(true);
    } else {
      setConfig(emptyConfig(source));
    }
  };

  const confirmSourceChange = () => {
    if (pendingSource) setConfig(emptyConfig(pendingSource));
    setPendingSource(null);
  };

  const addFilter = () => {
    const first = filterFields[0];
    if (!first) return;
    setConfig({ ...config, filters: [...config.filters, { field: first.key, operator: "equals", value: "" }] });
  };

  const updateFilter = (idx: number, f: ReportFilter) => {
    const next = [...config.filters];
    next[idx] = f;
    setConfig({ ...config, filters: next });
  };

  const removeFilter = (idx: number) => {
    setConfig({ ...config, filters: config.filters.filter((_, i) => i !== idx) });
  };

  const doSave = async () => {
    if (!name.trim()) {
      showToast("Give your report a name.", "error");
      return;
    }
    setSaving(true);
    const res = initial
      ? await updateReport(initial.id, { name: name.trim(), description: description.trim() || undefined, config })
      : await saveReport({ name: name.trim(), description: description.trim() || undefined, config });
    setSaving(false);
    if (res.error) {
      showToast(res.error.message, "error");
      return;
    }
    showToast(initial ? "Report updated." : "Report saved.", "success");
    setSaveOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-[#E5E5E3] bg-white p-5 space-y-5">
        <Select
          label="Data source"
          options={DATA_SOURCES.map((s) => ({ value: s, label: DATA_SOURCE_LABELS[s] }))}
          value={config.dataSource}
          onChange={(e) => changeSource(e.target.value as ReportDataSource)}
        />

        <ReportFieldPicker fields={fields} selected={config.fields} onChange={(v) => setConfig({ ...config, fields: v })} />

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-medium text-[#0A0A0A]">Filters</p>
            <Button size="sm" variant="ghost" leadingIcon={<Plus size={14} />} onClick={addFilter}>
              Add filter
            </Button>
          </div>
          <div className="space-y-2">
            {config.filters.length === 0 && <p className="text-[13px] text-[#6B6B6B]">No filters — showing all rows.</p>}
            {config.filters.map((f, idx) => (
              <ReportFilterRow
                key={idx}
                fields={filterFields}
                filter={f}
                onChange={(nf) => updateFilter(idx, nf)}
                onRemove={() => removeFilter(idx)}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Group by"
            placeholder="No grouping"
            options={fields.map((f) => ({ value: f.key, label: f.label }))}
            value={config.groupBy ?? ""}
            onChange={(e) => setConfig({ ...config, groupBy: e.target.value || undefined })}
          />
          <Select
            label="Sort by"
            placeholder="No sorting"
            options={fields.map((f) => ({ value: f.key, label: f.label }))}
            value={config.sortBy ?? ""}
            onChange={(e) => setConfig({ ...config, sortBy: e.target.value || undefined })}
          />
          <Select
            label="Sort direction"
            options={[{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }]}
            value={config.sortDirection ?? "asc"}
            onChange={(e) => setConfig({ ...config, sortDirection: e.target.value as "asc" | "desc" })}
            disabled={!config.sortBy}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-[#0A0A0A]">Preview</h3>
        <div className="flex items-center gap-2">
          <ReportExportMenu rows={preview.rows} columns={preview.columns} filenameBase="custom-report" disabled={preview.rows.length === 0} />
          <Button variant="primary" leadingIcon={<Save size={14} />} onClick={() => setSaveOpen(true)}>
            {initial ? "Update report" : "Save this as a report"}
          </Button>
        </div>
      </div>

      <ReportTable columns={preview.columns} rows={preview.rows} loading={loadingPreview} />

      {saveOpen && (
        <div className="rounded-md border border-[#E5E5E3] bg-white p-5 space-y-4 max-w-lg">
          <h3 className="text-[15px] font-semibold text-[#0A0A0A]">{initial ? "Update report" : "Save this report"}</h3>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Active engineering headcount" />
          <Textarea label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={() => void doSave()}>Save</Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Change data source?"
        description="Switching the data source will clear your current fields, filters, grouping and sorting."
        confirmLabel="Switch data source"
        variant="warning"
        onConfirm={confirmSourceChange}
        onCancel={() => setPendingSource(null)}
      />
    </div>
  );
}
