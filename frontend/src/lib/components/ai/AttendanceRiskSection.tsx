/** AI-detected attendance risk signals — a list of flags with dismiss flow. Judgement calls only. */
import { useEffect, useState } from "react";
import { EmptyState, Select, type SelectOption } from "@/lib/components/ui";
import { PermissionGuard } from "@/lib/components/rbac";
import { dismissRiskFlag, listAttendanceRiskFlags } from "@/lib/api/ai";
import type { AttendanceRiskFlag } from "@/lib/types/ai";
import { AiBadge } from "./AiBadge";
import { RiskEmployeeRow } from "./RiskEmployeeRow";

export interface AttendanceRiskSectionProps {
  /** Restrict to these employee ids (e.g. a manager's direct reports). Omit for company-wide. */
  employeeIds?: string[];
  /** Show a department filter select (HR admin, company-wide view). */
  departmentOptions?: SelectOption[];
  getDepartmentId?: (employeeId: string) => string | undefined;
}

export function AttendanceRiskSection({ employeeIds, departmentOptions, getDepartmentId }: AttendanceRiskSectionProps) {
  const [flags, setFlags] = useState<AttendanceRiskFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDismissed, setShowDismissed] = useState(false);
  const [department, setDepartment] = useState("");

  const load = () => {
    setLoading(true);
    void listAttendanceRiskFlags().then((r) => {
      setFlags(r.data ?? []);
      setLoading(false);
    });
  };
  useEffect(load, []);

  const handleDismiss = async (id: string, reason: string) => {
    const r = await dismissRiskFlag(id, reason);
    if (r.data) setFlags(r.data);
  };

  let scoped = flags;
  if (employeeIds) scoped = scoped.filter((f) => employeeIds.includes(f.employeeId));
  if (department && getDepartmentId) scoped = scoped.filter((f) => getDepartmentId(f.employeeId) === department);

  const open = scoped.filter((f) => f.status !== "dismissed");
  const dismissed = scoped.filter((f) => f.status === "dismissed");

  return (
    <PermissionGuard permission="ai.review_anomalies">
      <div className="rounded-md border border-[#E5E5E3] bg-white p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">AI-detected attendance signals</h3>
            <AiBadge />
          </div>
          <button type="button" onClick={load} className="text-[13px] text-[#6B6B6B] hover:text-[#0A0A0A]">
            Refresh analysis ↻
          </button>
        </div>
        <p className="text-[12px] text-[#6B6B6B]">
          These are signals worth a conversation, not conclusions. Use your judgement.
        </p>

        {departmentOptions && (
          <div className="max-w-xs">
            <Select
              label="Department"
              placeholder="All departments"
              options={departmentOptions}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>
        )}

        {loading ? null : open.length === 0 ? (
          <EmptyState title="No risk signals detected" subtitle="Nothing stands out for the current selection." />
        ) : (
          <div className="space-y-3">
            {open.map((f) => (
              <RiskEmployeeRow key={f.id} flag={f} onDismiss={handleDismiss} />
            ))}
          </div>
        )}

        {dismissed.length > 0 && (
          <div className="pt-2 border-t border-[#E5E5E3]">
            <button
              type="button"
              onClick={() => setShowDismissed((v) => !v)}
              className="text-[13px] text-[#6B6B6B] hover:text-[#0A0A0A]"
            >
              {showDismissed ? "Hide" : "Show"} dismissed ({dismissed.length})
            </button>
            {showDismissed && (
              <div className="mt-3 space-y-3">
                {dismissed.map((f) => (
                  <RiskEmployeeRow key={f.id} flag={f} onDismiss={handleDismiss} dismissed />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
