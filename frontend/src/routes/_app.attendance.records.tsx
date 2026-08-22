import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Alert, Badge, Button, Card, DataTable, DatePicker, EmptyState, FileUpload, Input, Modal, Select, SlideOver,
  Spinner, TimePicker, showToast, type ColumnDef,
} from "@/lib/components/ui";
import { PermissionGuard } from "@/lib/components/rbac";
import { AttendanceStatusBadge } from "@/lib/components/attendance";
import { AttendanceRiskSection } from "@/lib/components/ai";
import { settingsApi, type Department } from "@/lib/api/settings";
import { attendanceApi } from "@/lib/api/attendance";
import { listEmployees } from "@/lib/api/employees";
import { ATTENDANCE_STATUS_LABELS, type AttendanceStatus, type DailyAttendance } from "@/lib/types/attendance";
import type { Employee } from "@/lib/types/employee";

export const Route = createFileRoute("/_app/attendance/records")({
  component: RecordsPage,
  pendingComponent: () => <div className="flex justify-center py-20"><Spinner size={28} /></div>,
  head: () => ({
    meta: [
      { title: "Attendance Records — HRMS" },
      { name: "description", content: "Review, edit, import and export daily attendance records for every employee." },
      { property: "og:title", content: "Attendance Records — HRMS" },
      { property: "og:description", content: "Review, edit, import and export daily attendance records for every employee." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = Object.entries(ATTENDANCE_STATUS_LABELS).map(
  ([value, label]) => ({ value: value as AttendanceStatus, label }),
);

function toHHmm(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

interface ManualForm {
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut: string;
  status: AttendanceStatus | "";
  note: string;
}

function emptyForm(): ManualForm {
  return { employeeId: "", date: new Date().toISOString().slice(0, 10), clockIn: "", clockOut: "", status: "", note: "" };
}

type ImportRow = { line: number; employeeName?: string; date: string; clockIn?: string; clockOut?: string; error?: string };

function RecordsPage() {
  return (
    <PermissionGuard
      permission="attendance.manage"
      fallback={<Alert variant="error">You don't have access to attendance records.</Alert>}
    >
      <RecordsInner />
    </PermissionGuard>
  );
}

function RecordsInner() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [records, setRecords] = useState<DailyAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  const [employeeId, setEmployeeId] = useState("");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 13);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<AttendanceStatus | "">("");

  const [manualOpen, setManualOpen] = useState(false);
  const [form, setForm] = useState<ManualForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importRows, setImportRows] = useState<ImportRow[] | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    void listEmployees().then((r) => setEmployees(r.data ?? []));
    void settingsApi.listDepartments().then((r) => setDepartments(r.data ?? []));
  }, []);

  const load = async () => {
    setLoading(true);
    const res = await attendanceApi.listRecords({
      employeeId: employeeId || undefined,
      from,
      to,
      statuses: status ? [status] : undefined,
    });
    setRecords(res.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [employeeId, from, to, status]);

  const employeeOptions = useMemo(
    () => employees.map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName} (${e.employeeCode})` })),
    [employees],
  );

  const openManual = (rec?: DailyAttendance) => {
    if (rec) {
      setForm({
        employeeId: rec.employeeId,
        date: rec.date,
        clockIn: toHHmm(rec.clockIn),
        clockOut: toHHmm(rec.clockOut),
        status: rec.status,
        note: rec.note ?? "",
      });
    } else {
      setForm(emptyForm());
    }
    setManualOpen(true);
  };

  const saveManual = async () => {
    if (!form.employeeId || !form.date) {
      showToast("Employee and date are required", "error");
      return;
    }
    setSaving(true);
    const res = await attendanceApi.saveManualEntry({
      employeeId: form.employeeId,
      date: form.date,
      clockIn: form.clockIn || undefined,
      clockOut: form.clockOut || undefined,
      status: form.status || undefined,
      note: form.note.trim() || undefined,
    });
    setSaving(false);
    if (res.error) {
      showToast(res.error.message, "error");
      return;
    }
    showToast("Attendance record saved", "success");
    setManualOpen(false);
    void load();
  };

  const previewImport = async (file: File) => {
    setImportFile(file);
    const text = await file.text();
    const res = await attendanceApi.importCsv(text, false);
    if (res.error) {
      showToast(res.error.message, "error");
      setImportRows(null);
      return;
    }
    setImportRows(res.data?.rows ?? []);
  };

  const commitImport = async () => {
    if (!importFile) return;
    setImporting(true);
    const text = await importFile.text();
    const res = await attendanceApi.importCsv(text, true);
    setImporting(false);
    if (res.error) {
      showToast(res.error.message, "error");
      return;
    }
    showToast(`Imported ${res.data?.imported ?? 0} record(s)`, "success");
    setImportOpen(false);
    setImportFile(null);
    setImportRows(null);
    void load();
  };

  const exportCsv = () => {
    const header = "employeeCode,employeeName,date,clockIn,clockOut,status,workedMinutes";
    const lines = records.map((r) => {
      const emp = employees.find((e) => e.id === r.employeeId);
      return [
        emp?.employeeCode ?? "",
        r.employeeName,
        r.date,
        toHHmm(r.clockIn),
        toHHmm(r.clockOut),
        r.status,
        r.workedMinutes,
      ].join(",");
    });
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-records-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Export started", "success");
  };

  const columns: ColumnDef<DailyAttendance>[] = [
    { key: "date", label: "Date", sortable: true },
    { key: "employeeName", label: "Employee" },
    { key: "shiftName", label: "Shift", render: (r) => r.shiftName ?? "—" },
    { key: "clockIn", label: "In", render: (r) => toHHmm(r.clockIn) || "—" },
    { key: "clockOut", label: "Out", render: (r) => toHHmm(r.clockOut) || "—" },
    { key: "workedMinutes", label: "Worked", align: "right", render: (r) => `${Math.floor(r.workedMinutes / 60)}h ${r.workedMinutes % 60}m` },
    { key: "status", label: "Status", render: (r) => <AttendanceStatusBadge status={r.status} /> },
    { key: "source", label: "Source", render: (r) => <Badge variant="default">{r.source}</Badge> },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (r) => (
        <Button size="sm" variant="secondary" onClick={() => openManual(r)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-[20px] font-semibold">Attendance records</h2>
          <p className="text-[13px] text-[#6B6B6B] mt-1">Review, correct and import daily attendance for the organisation.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
          <Button variant="secondary" onClick={() => setImportOpen(true)}>Import CSV</Button>
          <Button onClick={() => openManual()}>+ Manual entry</Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Select
            label="Employee"
            placeholder="All employees"
            options={employeeOptions}
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          />
          <DatePicker label="From" value={from} onChange={setFrom} />
          <DatePicker label="To" value={to} onChange={setTo} />
          <Select
            label="Status"
            placeholder="All statuses"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => setStatus(e.target.value as AttendanceStatus | "")}
          />
        </div>
      </Card>

      <AttendanceRiskSection
        departmentOptions={departments.map((d) => ({ value: d.id, label: d.name }))}
        getDepartmentId={(id) => employees.find((e) => e.id === id)?.departmentId}
      />

      <Card className="p-0">
        <DataTable
          columns={columns}
          data={records}
          loading={loading}
          getRowKey={(r) => r.id}
          emptyState={<EmptyState title="No attendance records found." subtitle="Try widening the date range or clearing filters." />}
        />
      </Card>

      <SlideOver
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        title="Manual attendance entry"
        description="Create or correct a single day's attendance record."
        footer={
          <>
            <Button variant="secondary" onClick={() => setManualOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={saveManual}>Save</Button>
          </>
        }
      >
        <div className="space-y-5">
          <Select
            label="Employee"
            placeholder="Select employee"
            options={employeeOptions}
            value={form.employeeId}
            onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
          />
          <DatePicker label="Date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
          <div className="grid grid-cols-2 gap-4">
            <TimePicker label="Clock in" value={form.clockIn} onChange={(v) => setForm({ ...form, clockIn: v })} />
            <TimePicker label="Clock out" value={form.clockOut} onChange={(v) => setForm({ ...form, clockOut: v })} />
          </div>
          <Select
            label="Status override (optional)"
            placeholder="Auto-derive"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as AttendanceStatus | "" })}
          />
          <Input label="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
      </SlideOver>

      <Modal
        open={importOpen}
        onClose={() => { setImportOpen(false); setImportFile(null); setImportRows(null); }}
        title="Import attendance CSV"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <p className="text-[13px] text-[#6B6B6B]">
            Header: <code>employeeCode,date,clockIn,clockOut</code> (times as HH:mm, date as YYYY-MM-DD).
          </p>
          <FileUpload
            label="CSV file"
            accept=".csv"
            onFileSelect={(f) => void previewImport(f)}
            onFileRemove={() => { setImportFile(null); setImportRows(null); }}
            currentFile={importFile ? { name: importFile.name, sizeKB: Math.round(importFile.size / 1024) } : null}
          />
          {importRows && (
            <div className="max-h-64 overflow-auto border border-[#E5E5E3] rounded-sm">
              <table className="w-full text-[12px]">
                <thead className="bg-[#FAFAF9] sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">Line</th>
                    <th className="text-left px-3 py-2">Employee</th>
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-left px-3 py-2">In</th>
                    <th className="text-left px-3 py-2">Out</th>
                    <th className="text-left px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.map((r) => (
                    <tr key={r.line} className="border-t border-[#E5E5E3]">
                      <td className="px-3 py-1.5">{r.line}</td>
                      <td className="px-3 py-1.5">{r.employeeName ?? "—"}</td>
                      <td className="px-3 py-1.5">{r.date}</td>
                      <td className="px-3 py-1.5">{r.clockIn ?? "—"}</td>
                      <td className="px-3 py-1.5">{r.clockOut ?? "—"}</td>
                      <td className="px-3 py-1.5">
                        {r.error ? <span className="text-[#DC2626]">{r.error}</span> : <span className="text-[#16A34A]">OK</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setImportOpen(false); setImportFile(null); setImportRows(null); }}>
              Cancel
            </Button>
            <Button
              loading={importing}
              disabled={!importRows || importRows.every((r) => r.error)}
              onClick={commitImport}
            >
              Import
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
