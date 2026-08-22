import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Button,
  DataTable,
  EmptyState,
  Select,
  Spinner,
  StatCard,
  TimePicker,
  DatePicker,
  Textarea,
  showToast,
  type ColumnDef,
} from "@/lib/components/ui";
import { RegularizationStatusBadge } from "@/lib/components/attendance";
import { attendanceApi } from "@/lib/api/attendance";
import { useCurrentEmployee } from "@/lib/hooks/useCurrentEmployee";
import {
  ATTENDANCE_STATUS_COLORS,
  ATTENDANCE_STATUS_LABELS,
  REGULARIZATION_TYPE_LABELS,
  type DailyAttendance,
  type RegularizationRequest,
  type RegularizationType,
} from "@/lib/types/attendance";
import { dateKey, formatClock, pad2 } from "@/lib/utils/attendanceChecks";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  Send,
} from "lucide-react";

export const Route = createFileRoute("/_app/attendance/regularization/")({
  component: MyRegularizations,
  head: () => ({
    meta: [
      { title: "My Regularizations — HRMS" },
      { name: "description", content: "Apply for attendance regularization and track the status of your requests." },
      { property: "og:title", content: "My Regularizations — HRMS" },
      { property: "og:description", content: "Apply for attendance regularization and track the status of your requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const TYPE_OPTIONS = Object.entries(REGULARIZATION_TYPE_LABELS).map(([value, label]) => ({ value, label }));
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function MyRegularizations() {
  const { employee, loading: loadingMe } = useCurrentEmployee();
  const [list, setList] = useState<RegularizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Calendar State
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [records, setRecords] = useState<DailyAttendance[]>([]);

  const [form, setForm] = useState({
    date: dateKey(new Date()),
    type: "missing_clock_out" as RegularizationType,
    requestedClockIn: "09:30",
    requestedClockOut: "18:30",
    reason: "",
  });

  const loadData = async (empId: string, y: number, m: number) => {
    setLoading(true);
    const [regsRes, recsRes] = await Promise.all([
      attendanceApi.listRegularizations({ employeeId: empId }),
      attendanceApi.getMonth(empId, y, m),
    ]);
    setList(regsRes.data ?? []);
    setRecords(recsRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (employee) void loadData(employee.id, year, month);
  }, [employee?.id, year, month]);

  const submit = async () => {
    if (!employee) return;
    setSaving(true);
    const res = await attendanceApi.createRegularization({ employeeId: employee.id, ...form });
    setSaving(false);
    if (res.error) return showToast(res.error.message, "error");
    showToast("Regularization request submitted", "success");
    setForm((f) => ({ ...f, reason: "" }));
    void loadData(employee.id, year, month);
  };

  const cancel = async (id: string) => {
    const res = await attendanceApi.cancelRegularization(id);
    if (res.error) return showToast(res.error.message, "error");
    showToast("Request cancelled", "info");
    if (employee) void loadData(employee.id, year, month);
  };

  // Metrics
  const pendingCount = useMemo(() => list.filter((r) => r.status === "pending").length, [list]);
  const approvedCount = useMemo(() => list.filter((r) => r.status === "approved").length, [list]);
  const rejectedCount = useMemo(() => list.filter((r) => r.status === "rejected").length, [list]);

  // Calendar Helpers
  const byDate = useMemo(() => new Map(records.map((r) => [r.date, r])), [records]);
  const regsByDate = useMemo(() => new Map(list.map((r) => [r.date, r])), [list]);

  const firstDay = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const leadDays = firstDay.getDay();
  const monthLabel = firstDay.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const todayKey = dateKey(new Date());

  const selectedDayRecord = byDate.get(form.date);
  const selectedDayRequest = regsByDate.get(form.date);

  const columns: ColumnDef<RegularizationRequest>[] = [
    {
      key: "date",
      label: "Date",
      render: (r) => (
        <span className="font-bold text-[#0A0A0A] tabular-nums">{r.date}</span>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0A0A0A]">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          {REGULARIZATION_TYPE_LABELS[r.type]}
        </span>
      ),
    },
    {
      key: "requestedClockIn",
      label: "Requested In",
      render: (r) => <span className="tabular-nums font-medium text-[#404040]">{r.requestedClockIn ?? "—"}</span>,
    },
    {
      key: "requestedClockOut",
      label: "Requested Out",
      render: (r) => <span className="tabular-nums font-medium text-[#404040]">{r.requestedClockOut ?? "—"}</span>,
    },
    {
      key: "reason",
      label: "Reason",
      render: (r) => (
        <span className="text-[12px] text-[#6B6B6B] line-clamp-1 max-w-xs block" title={r.reason}>
          {r.reason}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <RegularizationStatusBadge status={r.status} />,
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (r) =>
        r.status === "pending" ? (
          <Button size="sm" variant="ghost" onClick={() => void cancel(r.id)} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50">
            Cancel
          </Button>
        ) : (
          r.reviewComment && <span className="text-[12px] italic text-[#8E8E8E] max-w-[150px] truncate block">{r.reviewComment}</span>
        ),
    },
  ];

  if (loadingMe) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* Top Bento Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending Approvals"
          value={String(pendingCount)}
          variant={pendingCount > 0 ? "dark" : "default"}
          icon={<Clock className="w-4 h-4" />}
          trend={pendingCount > 0 ? "Under review" : "All clear"}
          trendDir={pendingCount > 0 ? "down" : "up"}
          actionHint
        >
          {pendingCount > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-ping" />
              <span className="text-[11px] font-medium text-neutral-300">Awaiting manager review</span>
            </div>
          )}
        </StatCard>

        <StatCard
          label="Approved Requests"
          value={String(approvedCount)}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          trend="Applied & adjusted"
          trendDir="up"
        />

        <StatCard
          label="Rejected / Returned"
          value={String(rejectedCount)}
          icon={<XCircleIcon className="w-4 h-4 text-rose-600" />}
          trend={rejectedCount > 0 ? "Requires correction" : "No rejections"}
          trendDir={rejectedCount > 0 ? "down" : "neutral"}
        />

        <StatCard
          label="Monthly Allowance"
          value="3 / month"
          icon={<Sparkles className="w-4 h-4 text-orange-500" />}
          trend="Standard policy"
          trendDir="neutral"
        />
      </div>

      {/* Main Asymmetrical Bento Section: Interactive Calendar (2 Cols) & Form (3 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 sm:gap-6">
        {/* Interactive Calendar Bento Tile (2 Columns) */}
        <div className="lg:col-span-2 rounded-3xl border border-[#E5E5E3] bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between overflow-hidden">
          <div>
            {/* Calendar Header */}
            <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-[#F2F2F0]">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAFAF8] text-[#6B6B6B] border border-[#E5E5E3]">
                    <CalendarIcon className="w-3 h-3 text-orange-500" />
                    Attendance Picker
                  </span>
                </div>
                <h3 className="text-[18px] sm:text-[20px] font-extrabold text-[#0A0A0A] tracking-tight">
                  {monthLabel}
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => {
                    const nm = month === 0 ? 11 : month - 1;
                    const ny = month === 0 ? year - 1 : year;
                    setMonth(nm);
                    setYear(ny);
                  }}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-[#E5E5E3] bg-white text-[#0A0A0A] hover:bg-[#F9F9F7] active:scale-95 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => {
                    const nm = month === 11 ? 0 : month + 1;
                    const ny = month === 11 ? year + 1 : year;
                    setMonth(nm);
                    setYear(ny);
                  }}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-[#E5E5E3] bg-white text-[#0A0A0A] hover:bg-[#F9F9F7] active:scale-95 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Day Labels */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
              {WD.map((d) => (
                <span key={d} className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8E8E8E]">
                  {d}
                </span>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {Array.from({ length: leadDays }).map((_, i) => (
                <div key={`lead-${i}`} className="aspect-square rounded-xl bg-[#FAFAF8]/50" />
              ))}

              {Array.from({ length: totalDays }).map((_, i) => {
                const d = new Date(year, month, i + 1);
                const dKey = dateKey(d);
                const rec = byDate.get(dKey);
                const req = regsByDate.get(dKey);
                const isSelected = form.date === dKey;
                const isToday = dKey === todayKey;
                const color = rec ? ATTENDANCE_STATUS_COLORS[rec.status] : ATTENDANCE_STATUS_COLORS.not_marked;

                // Check if day is an anomaly (absent, late, or missing clock out)
                const isAnomaly = rec && (rec.status === "absent" || rec.status === "late" || (rec.clockIn && !rec.clockOut));

                return (
                  <button
                    key={dKey}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, date: dKey }))}
                    className={`aspect-square rounded-xl border p-1 sm:p-1.5 flex flex-col justify-between transition-all duration-200 relative text-left ${
                      isSelected
                        ? "border-[#0A0A0A] bg-[#FAFAF9] shadow-xs ring-2 ring-[#0A0A0A]/10 scale-[1.03] z-10"
                        : isToday
                        ? "border-orange-400 bg-orange-50/20"
                        : "border-[#E5E5E3] bg-white hover:border-[#A3A3A3] hover:bg-[#FAFAF9]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[11px] sm:text-[12px] font-bold tabular-nums ${isToday ? "text-orange-600 font-extrabold" : "text-[#0A0A0A]"}`}>
                        {i + 1}
                      </span>
                      {req && (
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 ring-2 ring-orange-200" title="Regularization request exists" />
                      )}
                    </div>

                    <div className="flex items-center justify-between w-full mt-auto">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: color }}
                        title={rec ? ATTENDANCE_STATUS_LABELS[rec.status] : "Not marked"}
                      />
                      {isAnomaly && !req && (
                        <ShieldAlert className="w-3 h-3 text-amber-500 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date Summary Panel */}
          <div className="mt-5 p-4 rounded-2xl bg-[#FAFAF9] border border-[#E5E5E3]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#8E8E8E]">Selected Date</span>
              <span className="text-[12px] font-bold text-[#0A0A0A] tabular-nums">{form.date}</span>
            </div>

            {selectedDayRecord ? (
              <div className="space-y-1.5 text-[12px]">
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>Status:</span>
                  <span className="font-semibold text-[#0A0A0A]">{ATTENDANCE_STATUS_LABELS[selectedDayRecord.status]}</span>
                </div>
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>Clock In / Out:</span>
                  <span className="font-medium tabular-nums text-[#0A0A0A]">
                    {formatClock(selectedDayRecord.clockIn)} - {formatClock(selectedDayRecord.clockOut)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-[#8E8E8E]">No attendance record logged for this date.</p>
            )}

            {selectedDayRequest && (
              <div className="mt-2.5 pt-2 border-t border-[#E5E5E3] flex items-center justify-between text-[11px]">
                <span className="font-semibold text-orange-600">Request status:</span>
                <RegularizationStatusBadge status={selectedDayRequest.status} />
              </div>
            )}
          </div>
        </div>

        {/* Regularization Application Form (3 Columns) */}
        <div className="lg:col-span-3 rounded-3xl border border-[#E5E5E3] bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#F2F2F0]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#8E8E8E]">Adjustment Request</span>
                </div>
                <h2 className="text-[20px] sm:text-[22px] font-extrabold text-[#0A0A0A] tracking-tight">
                  Apply for Regularization
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                {REGULARIZATION_TYPE_LABELS[form.type]}
              </span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DatePicker
                  label="Target Date"
                  value={form.date}
                  onChange={(v) => setForm({ ...form, date: v })}
                  maxDate={dateKey(new Date())}
                />
                <Select
                  label="Regularization Type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as RegularizationType })}
                  options={TYPE_OPTIONS}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TimePicker
                  label="Requested Clock In"
                  value={form.requestedClockIn}
                  onChange={(v) => setForm({ ...form, requestedClockIn: v })}
                />
                <TimePicker
                  label="Requested Clock Out"
                  value={form.requestedClockOut}
                  onChange={(v) => setForm({ ...form, requestedClockOut: v })}
                />
              </div>

              <div className="space-y-1">
                <Textarea
                  label="Reason for Regularization"
                  placeholder="Provide detailed justification (minimum 10 characters)..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={4}
                />
                <div className="flex items-center justify-between text-[11px] text-[#8E8E8E] px-1">
                  <span>Minimum 10 characters required</span>
                  <span className={form.reason.trim().length >= 10 ? "text-emerald-600 font-semibold" : "text-amber-600"}>
                    {form.reason.trim().length} / 10
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#F2F2F0] flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setForm({
                  date: dateKey(new Date()),
                  type: "missing_clock_out",
                  requestedClockIn: "09:30",
                  requestedClockOut: "18:30",
                  reason: "",
                })
              }
              className="text-xs font-semibold text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
            >
              Reset form
            </button>

            <Button
              onClick={submit}
              loading={saving}
              disabled={form.reason.trim().length < 10}
              className="gap-2 px-6"
            >
              <Send className="w-3.5 h-3.5" />
              Submit request
            </Button>
          </div>
        </div>
      </div>

      {/* Modern Bento Table: My Requests */}
      <div className="rounded-2xl border border-[#E5E5E3] bg-white shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F2F2F0] flex items-center justify-between bg-[#FAFAF9]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-500" />
            <h3 className="text-[15px] font-extrabold text-[#0A0A0A] tracking-tight">
              My Request History
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#E5E5E3] text-[#0A0A0A]">
              {list.length}
            </span>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={list}
          loading={loading}
          getRowKey={(r) => r.id}
          emptyState={
            <EmptyState
              title="No regularization requests yet."
              subtitle="Select a date on the calendar above to apply for punch correction."
            />
          }
        />
      </div>
    </div>
  );
}

function XCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-4 h-4" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

