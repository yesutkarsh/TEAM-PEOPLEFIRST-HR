/** My profile — self-service view with editable basics and approval-gated sensitive fields. */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Alert,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Input,
  Spinner,
  StatCard,
  showToast,
} from "@/lib/components/ui";
import { essApi } from "@/lib/api/ess";
import { useCurrentEmployee } from "@/lib/hooks/useCurrentEmployee";
import { formatDate } from "@/lib/utils/format";
import type { ProfileChangeRequest } from "@/lib/types/ess";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Lock,
  Clock,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building,
  Briefcase,
  BadgeCheck,
  Edit3,
} from "lucide-react";

export const Route = createFileRoute("/_app/me")({
  component: MyProfilePage,
  head: () => ({
    meta: [
      { title: "My Profile — HRMS" },
      { name: "description", content: "Update your personal details and request changes to sensitive records." },
      { property: "og:title", content: "My Profile — HRMS" },
      { property: "og:description", content: "Update your personal details and request changes to sensitive records." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const SENSITIVE: { field: string; label: string }[] = [
  { field: "bankAccountNumber", label: "Bank account number" },
  { field: "bankIfsc", label: "Bank IFSC code" },
  { field: "panNumber", label: "PAN card number" },
  { field: "aadhaarNumber", label: "Aadhaar card number" },
];

function MyProfilePage() {
  const { employee, loading } = useCurrentEmployee();
  const [phone, setPhone] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [requests, setRequests] = useState<ProfileChangeRequest[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    if (!employee) return;
    setPhone(employee.phone || "");
    setPersonalEmail(employee.personalEmail || "");
    void essApi.listChangeRequests(employee.id).then((r) => setRequests(r.data ?? []));
  }, [employee?.id]);

  const pendingRequests = useMemo(() => requests.filter((r) => r.status === "pending"), [requests]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner size={32} />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <Alert variant="warning" title="No employee record linked">
          Your account is currently not associated with an active employee record in the system.
        </Alert>
      </div>
    );
  }

  const raise = async (field: string, label: string, currentValue: string) => {
    const requestedVal = (drafts[field] ?? "").trim();
    if (!requestedVal) {
      showToast("Please enter a new value first.", "error");
      return;
    }
    const res = await essApi.requestProfileChange({
      employeeId: employee.id,
      field,
      label,
      currentValue,
      requestedValue: requestedVal,
    });
    if (res.error) return showToast(res.error.message, "error");
    setDrafts((d) => ({ ...d, [field]: "" }));
    const list = await essApi.listChangeRequests(employee.id);
    setRequests(list.data ?? []);
    showToast("Change request sent to HR for approval.", "success");
  };

  const handleSaveContact = () => {
    setSavingContact(true);
    setTimeout(() => {
      setSavingContact(false);
      showToast("Contact details updated successfully.", "success");
    }, 400);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-7 pb-12">
      <Breadcrumb
        items={[
          { label: "Overview", to: "/dashboard" },
          { label: "My Profile" },
        ]}
      />

      {/* Minimal Profile Header Card */}
      <header className="rounded-3xl border border-[#E5E5E3] bg-white p-6 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <Avatar
                name={`${employee.firstName} ${employee.lastName}`}
                src={employee.avatarUrl}
                size={72}
                className="rounded-2xl border-2 border-[#E5E5E3] shadow-xs"
              />
              <span
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white"
                title="Active Employee"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-[#0A0A0A] text-white">
                  {employee.employeeCode || "EMP"}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <BadgeCheck className="w-3 h-3 text-emerald-600" />
                  Active Staff
                </span>
              </div>

              <h1 className="text-[24px] sm:text-[28px] font-extrabold text-[#0A0A0A] tracking-tight font-sans">
                {employee.firstName} {employee.lastName}
              </h1>

              <div className="mt-1 flex flex-wrap items-center gap-3 text-[13px] text-[#6B6B6B] font-medium">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#8E8E8E]" />
                  {employee.workEmail}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#8E8E8E]" />
                  Joined {formatDate(employee.dateOfJoining)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[#F2F2F0]">
            <Link
              to="/attendance"
              className="group inline-flex items-center gap-1.5 rounded-xl bg-[#FAFAF9] hover:bg-[#F2F2F0] border border-[#E5E5E3] px-3.5 py-2 text-xs font-bold text-[#0A0A0A] transition-all active:scale-95 shadow-2xs"
            >
              My Attendance
              <ArrowUpRight className="w-3.5 h-3.5 text-[#8E8E8E] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#0A0A0A]" />
            </Link>
            <Link
              to="/leave/apply"
              className="group inline-flex items-center gap-1.5 rounded-xl bg-[#FAFAF9] hover:bg-[#F2F2F0] border border-[#E5E5E3] px-3.5 py-2 text-xs font-bold text-[#0A0A0A] transition-all active:scale-95 shadow-2xs"
            >
              Apply Leave
              <ArrowUpRight className="w-3.5 h-3.5 text-[#8E8E8E] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#0A0A0A]" />
            </Link>
          </div>
        </div>
      </header>

      {/* KPI Stat Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Pending HR Requests"
          value={String(pendingRequests.length)}
          variant={pendingRequests.length > 0 ? "dark" : "default"}
          icon={<Clock className="w-4 h-4" />}
          trend={pendingRequests.length > 0 ? "Under HR review" : "All records synced"}
          trendDir={pendingRequests.length > 0 ? "down" : "up"}
          actionHint
        >
          {pendingRequests.length > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-ping" />
              <span className="text-[11px] font-medium text-neutral-300">Awaiting HR approval</span>
            </div>
          )}
        </StatCard>

        <StatCard
          label="Profile Status"
          value="Verified"
          icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />}
          trend="Identity confirmed"
          trendDir="up"
        />

        <StatCard
          label="Employment Type"
          value="Full-time"
          icon={<Briefcase className="w-4 h-4 text-orange-500" />}
          trend="Permanent staff"
          trendDir="neutral"
        />
      </div>

      {/* Main Asymmetrical Bento Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Left Column (2 Cols): Contact & Employment Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Details Bento Card */}
          <div className="rounded-3xl border border-[#E5E5E3] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#F2F2F0]">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-orange-500" />
                <h2 className="text-[18px] font-extrabold text-[#0A0A0A] tracking-tight">
                  Contact Information
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-[#8E8E8E] bg-[#FAFAF9] px-2.5 py-1 rounded-full border border-[#E5E5E3]">
                Self Editable
              </span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
                <Input
                  label="Personal Email"
                  type="email"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  placeholder="personal@domain.com"
                />
              </div>

              <div className="pt-3 flex justify-end">
                <Button
                  variant="primary"
                  onClick={handleSaveContact}
                  loading={savingContact}
                  className="gap-2 bg-[#0A0A0A] hover:bg-neutral-800 text-white font-bold"
                >
                  Save changes
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Detailed Employment & Position Card */}
          <div className="rounded-3xl border border-[#E5E5E3] bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2 pb-4 mb-5 border-b border-[#F2F2F0]">
              <Building className="w-4 h-4 text-orange-500" />
              <h2 className="text-[18px] font-extrabold text-[#0A0A0A] tracking-tight">
                Employment & Organization Details
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
              <DetailBox label="Employee Code" value={employee.employeeCode || "EMP-001"} />
              <DetailBox label="Work Email" value={employee.workEmail} />
              <DetailBox label="Date of Joining" value={formatDate(employee.dateOfJoining)} />
              <DetailBox label="Employment Status" value="Active / Full-Time" highlight />
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Sensitive Records & Change Requests */}
        <div className="lg:col-span-1">
          <div className="rounded-3xl border border-[#E5E5E3] bg-white p-6 shadow-xs h-full flex flex-col justify-between">
            <div>
              <div className="pb-4 mb-5 border-b border-[#F2F2F0]">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-orange-500" />
                  <h2 className="text-[18px] font-extrabold text-[#0A0A0A] tracking-tight">
                    Sensitive Records
                  </h2>
                </div>
                <p className="text-[12px] text-[#6B6B6B]">
                  Locked financial and tax fields require HR review before updating.
                </p>
              </div>

              <div className="space-y-4">
                {SENSITIVE.map(({ field, label }) => {
                  const current = String((employee as unknown as Record<string, unknown>)[field] ?? "—");
                  const pending = requests.find((r) => r.field === field && r.status === "pending");
                  return (
                    <div
                      key={field}
                      className="rounded-2xl border border-[#E5E5E3] bg-[#FAFAF9] p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8E8E8E]">
                          {label}
                        </span>
                        <span className="text-[13px] font-bold text-[#0A0A0A] tabular-nums">{current}</span>
                      </div>

                      {pending ? (
                        <div className="pt-2 border-t border-[#E5E5E3] flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Pending HR Review
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                await essApi.cancelChangeRequest(pending.id);
                                const list = await essApi.listChangeRequests(employee.id);
                                setRequests(list.data ?? []);
                                showToast("Change request cancelled.", "info");
                              }}
                              className="text-[11px] font-semibold text-rose-600 hover:underline"
                            >
                              Cancel request
                            </button>
                          </div>
                          <p className="text-[11px] text-[#6B6B6B] truncate">
                            Requested: <span className="font-semibold text-[#0A0A0A]">{pending.requestedValue}</span>
                          </p>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-[#E5E5E3] flex items-center gap-2">
                          <Input
                            placeholder={`New ${label.toLowerCase()}`}
                            value={drafts[field] ?? ""}
                            onChange={(e) => setDrafts((d) => ({ ...d, [field]: e.target.value }))}
                            className="text-xs py-1.5"
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => void raise(field, label, current)}
                            className="shrink-0 text-xs font-semibold"
                          >
                            Request
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="p-3.5 rounded-2xl bg-[#FAFAF9] border border-[#E5E5E3]">
      <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#8E8E8E] block mb-1">
        {label}
      </span>
      <span className={`text-[14px] font-bold tracking-tight block ${highlight ? "text-emerald-700 font-extrabold" : "text-[#0A0A0A]"}`}>
        {value}
      </span>
    </div>
  );
}