import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button, Card, DataTable, EmptyState, Input, SlideOver, ConfirmDialog, type ColumnDef } from "@/lib/components/ui";
import { showToast } from "@/lib/components/ui/Toast";
import { settingsApi, type Shift, type WorkCalendar } from "@/lib/api/settings";

export const Route = createFileRoute("/_app/settings/company/work-calendar")({
  component: WorkCalendarPage,
  head: () => ({ meta: [{ title: "Work calendar — Settings — HRMS" }] }),
});

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function DayPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="flex gap-2">
      {DAY_LABELS.map((d, i) => {
        const on = value.includes(i);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(on ? value.filter((x) => x !== i) : [...value, i].sort())}
            aria-pressed={on}
            aria-label={DAY_NAMES[i]}
            className={`h-10 w-10 rounded-full font-semibold text-[13px] transition-colors ${on ? "bg-[#0A0A0A] text-white" : "bg-white border border-[#E5E5E3] text-[#6B6B6B] hover:bg-[#F2F2F0]"}`}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}

function WorkCalendarPage() {
  const [cal, setCal] = useState<WorkCalendar>({ workingDays: [1, 2, 3, 4, 5] });
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Shift | null>(null);
  const [form, setForm] = useState<Omit<Shift, "id">>({ name: "", startTime: "09:30", endTime: "18:30", breakMinutes: 60, days: [1,2,3,4,5], graceMinutes: 15 });

  const load = async () => {
    setLoading(true);
    const [c, s] = await Promise.all([settingsApi.getWorkCalendar(), settingsApi.listShifts()]);
    if (c.data) setCal(c.data);
    if (s.data) setShifts(s.data);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const saveCal = async (next: number[]) => {
    const newCal = { workingDays: next };
    setCal(newCal);
    await settingsApi.saveWorkCalendar(newCal);
    showToast("Work week updated", "success");
  };

  const openAdd = () => { setEditing(null); setForm({ name: "", startTime: "09:30", endTime: "18:30", breakMinutes: 60, days: cal.workingDays, graceMinutes: 15 }); setOpen(true); };
  const openEdit = (s: Shift) => { setEditing(s); setForm({ name: s.name, startTime: s.startTime, endTime: s.endTime, breakMinutes: s.breakMinutes, days: s.days, graceMinutes: s.graceMinutes }); setOpen(true); };

  const saveShift = async () => {
    if (!form.name.trim()) { showToast("Shift name is required", "error"); return; }
    const res = await settingsApi.upsertShift({ id: editing?.id, ...form });
    if (res.error) { showToast(res.error.message, "error"); return; }
    setOpen(false);
    showToast(editing ? "Shift updated" : "Shift added", "success");
    await load();
  };

  const remove = async () => {
    if (!deleteTarget) return;
    await settingsApi.deleteShift(deleteTarget.id);
    showToast("Shift deleted", "success");
    await load();
  };

  const columns: ColumnDef<Shift>[] = [
    { key: "name", label: "Shift", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "startTime", label: "Start" },
    { key: "endTime", label: "End" },
    { key: "breakMinutes", label: "Break", render: (r) => `${r.breakMinutes} min` },
    { key: "days", label: "Days", render: (r) => r.days.map((d) => DAY_NAMES[d]).join(", ") },
    { key: "actions", label: "", align: "right", render: (r) => (
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
        <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(r)}>Delete</Button>
      </div>
    ) },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-[18px] font-semibold">Work week</h2>
        <p className="text-[13px] text-[#6B6B6B] mt-1 mb-4">Which days the company works. Default Mon–Fri.</p>
        <DayPicker value={cal.workingDays} onChange={saveCal} />
        <p className="text-[12px] text-[#6B6B6B] mt-3">{cal.workingDays.length} working {cal.workingDays.length === 1 ? "day" : "days"} per week</p>
      </Card>
      <div>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-[18px] font-semibold">Shifts</h2>
            <p className="text-[13px] text-[#6B6B6B] mt-1">Define when teams are expected to work.</p>
          </div>
          <Button onClick={openAdd}>+ Add shift</Button>
        </div>
        <DataTable
          columns={columns}
          data={shifts}
          loading={loading}
          getRowKey={(s) => s.id}
          emptyState={<EmptyState title="No shifts yet." subtitle="Define your first shift to set working hours." action={<Button onClick={openAdd}>Add shift</Button>} />}
        />
      </div>
      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit shift" : "New shift"}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={saveShift}>Save</Button></>}
      >
        <div className="space-y-5">
          <Input label="Shift name" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start time" type="text" placeholder="HH:mm" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            <Input label="End time" type="text" placeholder="HH:mm" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Break (minutes)" type="number" value={String(form.breakMinutes)} onChange={(e) => setForm({ ...form, breakMinutes: Number(e.target.value) || 0 })} />
            <Input label="Grace period (minutes)" type="number" value={String(form.graceMinutes)} onChange={(e) => setForm({ ...form, graceMinutes: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-[#0A0A0A]">Applicable days</p>
            <DayPicker value={form.days} onChange={(d) => setForm({ ...form, days: d })} />
          </div>
        </div>
      </SlideOver>
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete shift?"
        description={`Delete ${deleteTarget?.name}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={remove}
      />
    </div>
  );
}
