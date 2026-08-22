import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button, Card, ConfirmDialog, Checkbox, DataTable, EmptyState, Input, Select, SlideOver, Tabs, Textarea, type ColumnDef } from "@/lib/components/ui";
import { showToast } from "@/lib/components/ui/Toast";
import { settingsApi, type CompanyHoliday, type NationalHoliday } from "@/lib/api/settings";
import { tenantStore } from "@/lib/store/tenant";

export const Route = createFileRoute("/_app/settings/company/holidays")({
  component: HolidaysPage,
  head: () => ({ meta: [{ title: "Holidays — Settings — HRMS" }] }),
});

function HolidaysPage() {
  const tenant = tenantStore.useSelector((s) => s.tenant);
  const country = tenant?.settings.country ?? "United States";

  return (
    <Tabs
      tabs={[
        { id: "national", label: "National holidays", content: <NationalTab country={country} /> },
        { id: "company", label: "Company holidays", content: <CompanyTab /> },
      ]}
    />
  );
}

function NationalTab({ country }: { country: string }) {
  const [list, setList] = useState<NationalHoliday[]>([]);
  useEffect(() => { void settingsApi.getNationalHolidays(country).then((r) => r.data && setList(r.data)); }, [country]);

  const toggle = async (h: NationalHoliday) => {
    const next = !h.observed;
    setList((l) => l.map((x) => (x.id === h.id ? { ...x, observed: next } : x)));
    await settingsApi.toggleNationalHoliday(h.id, next);
  };

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-3 border-b border-[#E5E5E3] text-[13px] text-[#6B6B6B]">
        {country} · {list.length} holidays
      </div>
      {list.length === 0 ? (
        <EmptyState title="No national holidays for this country." />
      ) : (
        <ul className="divide-y divide-[#F2F2F0]">
          {list.map((h) => (
            <li key={h.id} className="px-5 py-3 flex items-center gap-3">
              <Checkbox checked={h.observed} onChange={() => toggle(h)} aria-label={h.name} />
              <div className="flex-1">
                <p className="text-[14px] font-medium">{h.name}</p>
                <p className="text-[12px] text-[#6B6B6B]">{new Date(h.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p>
              </div>
              <span className="text-[12px] text-[#6B6B6B]">{h.observed ? "Observed" : "Skipped"}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function CompanyTab() {
  const [list, setList] = useState<CompanyHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyHoliday | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyHoliday | null>(null);
  const [form, setForm] = useState<{ name: string; date: string; type: "full" | "half"; description: string }>({ name: "", date: "", type: "full", description: "" });

  const load = async () => {
    setLoading(true);
    const r = await settingsApi.listCompanyHolidays();
    if (r.data) setList(r.data);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ name: "", date: "", type: "full", description: "" }); setOpen(true); };
  const openEdit = (h: CompanyHoliday) => { setEditing(h); setForm({ name: h.name, date: h.date, type: h.type, description: h.description ?? "" }); setOpen(true); };

  const save = async () => {
    if (!form.name.trim() || !form.date) { showToast("Name and date are required", "error"); return; }
    await settingsApi.upsertCompanyHoliday({ id: editing?.id, name: form.name.trim(), date: form.date, type: form.type, description: form.description.trim() || undefined });
    setOpen(false);
    showToast(editing ? "Holiday updated" : "Holiday added", "success");
    await load();
  };

  const remove = async () => {
    if (!deleteTarget) return;
    await settingsApi.deleteCompanyHoliday(deleteTarget.id);
    showToast("Holiday deleted", "success");
    await load();
  };

  const columns: ColumnDef<CompanyHoliday>[] = [
    { key: "name", label: "Holiday", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "date", label: "Date", render: (r) => new Date(r.date).toLocaleDateString() },
    { key: "type", label: "Type", render: (r) => r.type === "full" ? "Full day" : "Half day" },
    { key: "actions", label: "", align: "right", render: (r) => (
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
        <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(r)}>Delete</Button>
      </div>
    ) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-[16px] font-semibold">Company holidays</h3>
          <p className="text-[13px] text-[#6B6B6B] mt-1">Office closure days, founder's day, etc.</p>
        </div>
        <Button onClick={openAdd}>+ Add holiday</Button>
      </div>
      <DataTable
        columns={columns}
        data={list}
        loading={loading}
        getRowKey={(h) => h.id}
        emptyState={<EmptyState title="No company holidays yet." subtitle="Add your first one." action={<Button onClick={openAdd}>Add holiday</Button>} />}
      />
      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit holiday" : "New holiday"}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></>}
      >
        <div className="space-y-5">
          <Input label="Holiday name" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Date" type="text" placeholder="YYYY-MM-DD" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Select label="Type" options={[{ value: "full", label: "Full day" }, { value: "half", label: "Half day" }]} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "full" | "half" })} />
          <Textarea label="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </SlideOver>
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete holiday?"
        description={`Delete ${deleteTarget?.name}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={remove}
      />
    </div>
  );
}
