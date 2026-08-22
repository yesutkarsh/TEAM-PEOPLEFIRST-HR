import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Alert,
  Badge,
  Breadcrumb,
  Button,
  DateRangePicker,
  FileUpload,
  RadioGroup,
  Select,
  Spinner,
  StatCard,
  Textarea,
  showToast,
} from "@/lib/components/ui";
import { LeaveBalanceCard, LeaveTypeBadge } from "@/lib/components/leave";
import { leaveApi } from "@/lib/api/leave";
import { listEmployees } from "@/lib/api/employees";
import { authStore } from "@/lib/store/auth";
import { calculateWorkingDays } from "@/lib/utils/workingDays";
import type { Employee } from "@/lib/types/employee";
import type { LeaveBalance, LeaveType } from "@/lib/types/leave";
import {
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  ArrowUpRight,
  FileText,
  CheckCircle2,
  AlertCircle,
  Zap,
  Sun,
  Moon,
  Info,
  Send,
  CalendarDays,
  ShieldCheck,
  Plane,
} from "lucide-react";

export const Route = createFileRoute("/_app/leave/apply")({
  component: ApplyLeavePage,
  pendingComponent: () => (
    <div className="flex justify-center py-20">
      <Spinner size={32} />
    </div>
  ),
  head: () => ({
    meta: [
      { title: "Apply for Leave — HRMS" },
      { name: "description", content: "Submit a new leave request with balance and working-day preview." },
      { property: "og:title", content: "Apply for Leave — HRMS" },
      { property: "og:description", content: "Submit a new leave request with balance and working-day preview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ApplyLeavePage() {
  const user = authStore.useSelector((s) => s.user);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Employee | null>(null);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [calendar, setCalendar] = useState<{ nonWorkingDays: number[]; holidays: Date[] }>({
    nonWorkingDays: [0, 6],
    holidays: [],
  });

  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState<"first_half" | "second_half">("first_half");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<{ name: string; sizeKB: number } | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [emps, lt, cal] = await Promise.all([
        listEmployees(),
        leaveApi.listLeaveTypes(false),
        leaveApi.getCalendarContext(),
      ]);
      if (!alive) return;
      const found = emps.data?.find((e) => e.workEmail === user?.email) ?? emps.data?.[0] ?? null;
      setMe(found);
      setTypes(lt.data ?? []);
      setCalendar(cal);
      if (found) {
        const b = await leaveApi.listBalances(found.id);
        if (alive) setBalances(b.data ?? []);
      }
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [user?.email]);

  const selectedType = types.find((t) => t.id === leaveTypeId) ?? null;
  const selectedBalance = balances.find((b) => b.leaveTypeId === leaveTypeId) ?? null;

  const workingDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return calculateWorkingDays(startDate, endDate, calendar.nonWorkingDays, calendar.holidays, isHalfDay);
  }, [startDate, endDate, calendar, isHalfDay]);

  useEffect(() => {
    if (isHalfDay && startDate) setEndDate(startDate);
  }, [isHalfDay, startDate]);

  // Quick Date Shortcut Handlers
  const handleShortcut = (type: "today" | "tomorrow" | "next_2" | "this_week" | "next_week") => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (type === "today") {
      setStartDate(today);
      setEndDate(today);
      setIsHalfDay(false);
    } else if (type === "tomorrow") {
      const tmrw = new Date(today);
      tmrw.setDate(tmrw.getDate() + 1);
      setStartDate(tmrw);
      setEndDate(tmrw);
      setIsHalfDay(false);
    } else if (type === "next_2") {
      const day2 = new Date(today);
      day2.setDate(day2.getDate() + 1);
      setStartDate(today);
      setEndDate(day2);
      setIsHalfDay(false);
    } else if (type === "this_week") {
      const day = today.getDay();
      const diffToFriday = day <= 5 ? 5 - day : 0;
      const fri = new Date(today);
      fri.setDate(fri.getDate() + diffToFriday);
      setStartDate(today);
      setEndDate(fri);
      setIsHalfDay(false);
    } else if (type === "next_week") {
      const day = today.getDay();
      const daysUntilNextMon = day === 0 ? 1 : 8 - day;
      const nextMon = new Date(today);
      nextMon.setDate(nextMon.getDate() + daysUntilNextMon);
      const nextFri = new Date(nextMon);
      nextFri.setDate(nextFri.getDate() + 4);
      setStartDate(nextMon);
      setEndDate(nextFri);
      setIsHalfDay(false);
    }
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!leaveTypeId) e.leaveTypeId = "Select a leave type.";
    if (!startDate || !endDate) e.dates = "Select a date range.";
    if (selectedType?.documentRequired === "always" && !file)
      e.file = "A supporting document is required for this leave type.";
    if (
      selectedType?.documentRequired === "after_n_days" &&
      selectedType.documentAfterDays &&
      workingDays > selectedType.documentAfterDays &&
      !file
    ) {
      e.file = `A supporting document is required for leave longer than ${selectedType.documentAfterDays} day(s).`;
    }
    if (selectedBalance && selectedType?.category !== "loss_of_pay" && workingDays > selectedBalance.available) {
      e.balance = `Insufficient balance — you have ${selectedBalance.available} day(s) available.`;
    }
    if (!reason.trim()) e.reason = "Please provide a reason for your leave.";
    return e;
  };

  const onSubmit = async () => {
    setSubmitError(null);
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) {
      setSubmitError("Please fix the errors indicated below.");
      return;
    }
    if (!me || !startDate || !endDate) return;
    setSubmitting(true);
    const res = await leaveApi.createRequest({
      employeeId: me.id,
      leaveTypeId,
      startDate,
      endDate,
      isHalfDay,
      halfDayPeriod: isHalfDay ? halfDayPeriod : undefined,
      reason: reason.trim(),
      documentName: file?.name,
      status: "pending",
    });
    setSubmitting(false);
    if (res.error) {
      setSubmitError(res.error.message);
      return;
    }
    showToast("Leave request submitted successfully.", "success");
    navigate({ to: "/leave/requests" });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-7 pb-12">
      <Breadcrumb
        items={[
          { label: "Overview", to: "/dashboard" },
          { label: "Leave Hub", to: "/leave" },
          { label: "Apply for Leave" },
        ]}
      />

      {/* Minimal Header Card Surface */}
      <header className="rounded-3xl border border-[#E5E5E3] bg-white p-6 sm:p-7 shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">

          <h1 className="text-[24px] sm:text-[28px] font-extrabold tracking-tight text-[#0A0A0A] font-sans">
            Apply for Leave
          </h1>
          <p className="mt-1 text-[13px] sm:text-[14px] text-[#6B6B6B] font-medium">
            Select leave type, pick date range, and view real-time working day calculations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/leave/requests"
            className="group inline-flex items-center gap-1.5 rounded-xl bg-[#FAFAF9] hover:bg-[#F2F2F0] border border-[#E5E5E3] px-3.5 py-2 text-xs font-bold text-[#0A0A0A] transition-all active:scale-95 shadow-2xs"
          >
            My Requests
            <ArrowUpRight className="w-3.5 h-3.5 text-[#8E8E8E] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#0A0A0A]" />
          </Link>
          <Link
            to="/leave/calendar"
            className="group inline-flex items-center gap-1.5 rounded-xl bg-[#FAFAF9] hover:bg-[#F2F2F0] border border-[#E5E5E3] px-3.5 py-2 text-xs font-bold text-[#0A0A0A] transition-all active:scale-95 shadow-2xs"
          >
            Leave Calendar
            <ArrowUpRight className="w-3.5 h-3.5 text-[#8E8E8E] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#0A0A0A]" />
          </Link>
        </div>
      </header>

      {submitError && <Alert variant="error" title="Couldn't submit leave request">{submitError}</Alert>}

      {/* Asymmetrical Bento 5-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 sm:gap-6">
        {/* Left Section (3 Columns): Form & Enhanced Date Picker UX */}
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-3xl border border-[#E5E5E3] bg-white p-6 sm:p-7 shadow-xs space-y-6">
            {/* Step 1: Select Leave Type */}
            <div className="space-y-2">
              <label className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#8E8E8E] block">
                1. Select Leave Type
              </label>
              <Select
                placeholder="Choose leave category..."
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                options={types.map((t) => ({ value: t.id, label: `${t.name} (${t.code})` }))}
                error={errors.leaveTypeId}
              />
              {selectedType && (
                <div className="mt-3 flex items-center gap-3 p-3.5 rounded-2xl bg-[#FAFAF9] border border-[#E5E5E3]">
                  <LeaveTypeBadge leaveType={selectedType} />
                  <span className="text-[12px] text-[#6B6B6B] font-medium">{selectedType.description}</span>
                </div>
              )}
            </div>

            {/* Step 2: Enhanced Date Selection UX */}
            <div className="pt-5 border-t border-[#F2F2F0] space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#8E8E8E] block">
                  2. Choose Dates & Duration
                </label>

                {/* Duration Type Segmented Toggle */}
                {selectedType?.allowHalfDay && (
                  <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#FAFAF9] border border-[#E5E5E3]">
                    <button
                      type="button"
                      onClick={() => setIsHalfDay(false)}
                      className={`px-3 py-1 text-[11px] font-extrabold rounded-lg transition-all ${
                        !isHalfDay
                          ? "bg-[#0A0A0A] text-white shadow-2xs"
                          : "text-[#6B6B6B] hover:text-[#0A0A0A]"
                      }`}
                    >
                      Full Day(s)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsHalfDay(true)}
                      className={`px-3 py-1 text-[11px] font-extrabold rounded-lg transition-all ${
                        isHalfDay
                          ? "bg-[#0A0A0A] text-white shadow-2xs"
                          : "text-[#6B6B6B] hover:text-[#0A0A0A]"
                      }`}
                    >
                      Half Day
                    </button>
                  </div>
                )}
              </div>

              {/* Half Day Period Selection Pills */}
              {isHalfDay && (
                <div className="p-3.5 rounded-2xl bg-orange-50/50 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
                  <span className="text-[12px] font-bold text-orange-950 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-orange-500" />
                    Half Day Slot:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setHalfDayPeriod("first_half")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        halfDayPeriod === "first_half"
                          ? "bg-orange-500 text-white border-orange-600 shadow-2xs"
                          : "bg-white text-[#404040] border-[#E5E5E3] hover:bg-orange-100/50"
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      First Half (Morning)
                    </button>
                    <button
                      type="button"
                      onClick={() => setHalfDayPeriod("second_half")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        halfDayPeriod === "second_half"
                          ? "bg-orange-500 text-white border-orange-600 shadow-2xs"
                          : "bg-white text-[#404040] border-[#E5E5E3] hover:bg-orange-100/50"
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      Second Half (Afternoon)
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Date Shortcuts Bar */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#8E8E8E] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-orange-500" /> Quick Date Shortcuts:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleShortcut("today")}
                    className="px-3 py-1.5 rounded-xl text-[12px] font-bold bg-[#FAFAF9] hover:bg-[#0A0A0A] text-[#0A0A0A] hover:text-white border border-[#E5E5E3] active:scale-95 transition-all shadow-2xs"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShortcut("tomorrow")}
                    className="px-3 py-1.5 rounded-xl text-[12px] font-bold bg-[#FAFAF9] hover:bg-[#0A0A0A] text-[#0A0A0A] hover:text-white border border-[#E5E5E3] active:scale-95 transition-all shadow-2xs"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShortcut("next_2")}
                    className="px-3 py-1.5 rounded-xl text-[12px] font-bold bg-[#FAFAF9] hover:bg-[#0A0A0A] text-[#0A0A0A] hover:text-white border border-[#E5E5E3] active:scale-95 transition-all shadow-2xs"
                  >
                    Next 2 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShortcut("this_week")}
                    className="px-3 py-1.5 rounded-xl text-[12px] font-bold bg-[#FAFAF9] hover:bg-[#0A0A0A] text-[#0A0A0A] hover:text-white border border-[#E5E5E3] active:scale-95 transition-all shadow-2xs"
                  >
                    This Week
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShortcut("next_week")}
                    className="px-3 py-1.5 rounded-xl text-[12px] font-bold bg-[#FAFAF9] hover:bg-[#0A0A0A] text-[#0A0A0A] hover:text-white border border-[#E5E5E3] active:scale-95 transition-all shadow-2xs"
                  >
                    Next Week
                  </button>
                </div>
              </div>

              {/* Date Range Picker Component */}
              <div>
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(s, e) => {
                    setStartDate(s);
                    setEndDate(isHalfDay ? s : e);
                  }}
                  minDate={new Date()}
                  holidays={calendar.holidays.map((d) => ({ date: d, name: "Holiday" }))}
                  nonWorkingDays={calendar.nonWorkingDays}
                  singleDay={isHalfDay}
                />
                {errors.dates && <p className="mt-2 text-[13px] text-rose-600 font-bold">{errors.dates}</p>}
              </div>

              {/* Live Working Days Calculation Micro Box */}
              {startDate && endDate && (
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    errors.balance
                      ? "bg-rose-50/60 border-rose-200 text-rose-950"
                      : "bg-[#FAFAF9] border-[#E5E5E3] text-[#0A0A0A]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#8E8E8E] flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-orange-500" />
                      Working Day Calculation
                    </span>
                    <span className="text-[18px] font-extrabold tabular-nums text-[#0A0A0A]">
                      {workingDays} {workingDays === 1 ? "Day" : "Days"}
                    </span>
                  </div>

                  {selectedBalance ? (
                    <div className="space-y-2.5 mt-2.5 pt-2.5 border-t border-[#E5E5E3]/80">
                      <div className="flex justify-between text-[12px]">
                        <span className="text-[#6B6B6B] font-medium">Available Allocation:</span>
                        <span className="font-bold tabular-nums text-[#0A0A0A]">
                          {selectedBalance.available} {selectedBalance.leaveType.name}
                        </span>
                      </div>

                      {/* Micro Progress Bar */}
                      {selectedBalance.available > 0 && (
                        <div className="w-full bg-[#E5E5E3] h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              workingDays > selectedBalance.available ? "bg-rose-500" : "bg-emerald-500"
                            }`}
                            style={{
                              width: `${Math.min(100, (workingDays / selectedBalance.available) * 100)}%`,
                            }}
                          />
                        </div>
                      )}

                      {errors.balance && (
                        <p className="text-[12px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {errors.balance}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[12px] text-[#6B6B6B] mt-1 font-medium">
                      Unallocated or loss of pay leave type selected.
                    </p>
                  )}
                </div>
              )}
            </div>


            {/* Step 3: Reason & Supporting Attachment */}
            <div className="pt-4 border-t border-[#F2F2F0] space-y-4">
              <label className="text-[12px] font-extrabold uppercase tracking-wider text-[#8E8E8E] block">
                3. Reason & Documentation
              </label>

              <Textarea
                placeholder="Briefly state your reason for taking leave..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                error={errors.reason}
                rows={3}
              />

              <FileUpload
                label="Supporting Document (optional or required per policy)"
                currentFile={file}
                onFileSelect={(f) => setFile({ name: f.name, sizeKB: Math.round(f.size / 1024) })}
                onFileRemove={() => setFile(null)}
                error={errors.file}
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-[#F2F2F0] flex items-center justify-between">
              <Button variant="secondary" onClick={() => navigate({ to: "/leave" })}>
                Cancel
              </Button>
              <Button
                onClick={onSubmit}
                loading={submitting}
                className="gap-2 bg-[#0A0A0A] hover:bg-neutral-800 text-white font-bold px-6"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Request
              </Button>
            </div>
          </div>
        </div>

        {/* Right Section (2 Columns): Leave Balances Side-by-Side View */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-4 rounded-3xl bg-[#FAFAF9] border border-[#E5E5E3] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E3]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-orange-500" />
                <h3 className="text-[15px] font-extrabold text-[#0A0A0A] tracking-tight">
                  My Leave Allocations
                </h3>
              </div>
              <span className="text-[11px] font-bold text-[#8E8E8E]">
                {balances.length} Types
              </span>
            </div>

            {balances.length > 0 ? (
              <div className="space-y-3">
                {balances.map((b) => (
                  <LeaveBalanceCard key={b.id} balance={b} />
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-[#6B6B6B] p-4 text-center">No leave allocations found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

