/** Single attendance risk signal row with dismiss flow. */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Badge, Button, Textarea } from "@/lib/components/ui";
import { RISK_LABELS, type AttendanceRiskFlag, type AttendanceRiskType } from "@/lib/types/ai";

const RISK_STYLES: Record<AttendanceRiskType, string> = {
  chronic_lateness: "border border-[#F59E0B] text-[#B45309] bg-transparent",
  rising_absenteeism: "border border-[#F59E0B] text-[#B45309] bg-transparent",
  possible_burnout: "border border-[#60A5FA] text-[#1D4ED8] bg-transparent",
  irregular_pattern: "border border-[#9CA3AF] text-[#3F3F46] bg-transparent",
};

export interface RiskEmployeeRowProps {
  flag: AttendanceRiskFlag;
  onDismiss: (id: string, reason: string) => Promise<void> | void;
  dismissed?: boolean;
}

export function RiskEmployeeRow({ flag, onDismiss, dismissed }: RiskEmployeeRowProps) {
  const [dismissing, setDismissing] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = reason.trim().length >= 10;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    await onDismiss(flag.id, reason.trim());
    setBusy(false);
    setDismissing(false);
  };

  return (
    <div className="rounded-md border border-[#E5E5E3] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-medium text-[#0A0A0A]">
            {flag.employee.firstName} {flag.employee.lastName}
          </p>
          <p className="mt-1 text-[13px] text-[#6B6B6B] leading-relaxed">{flag.rationale}</p>
          {dismissed && flag.dismissedReason && (
            <p className="mt-2 text-[12px] text-[#6B6B6B]">Dismissed: {flag.dismissedReason}</p>
          )}
        </div>
        <Badge variant="default" className={RISK_STYLES[flag.riskType]}>{RISK_LABELS[flag.riskType]}</Badge>
      </div>

      {!dismissed && (
        <div className="mt-3 flex items-center gap-4">
          <Link
            to="/employees/$employeeId"
            params={{ employeeId: flag.employeeId }}
            className="text-[13px] font-medium text-[var(--tenant-primary)] hover:underline"
          >
            View attendance →
          </Link>
          {!dismissing && (
            <button type="button" onClick={() => setDismissing(true)} className="text-[13px] text-[#6B6B6B] hover:text-[#0A0A0A]">
              Dismiss
            </button>
          )}
        </div>
      )}

      {dismissing && (
        <div className="mt-3 space-y-2">
          <Textarea
            label="Why are you dismissing this?"
            placeholder="Explain briefly (min. 10 characters)…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={!valid} loading={busy} onClick={submit}>Confirm dismiss</Button>
            <Button size="sm" variant="ghost" onClick={() => { setDismissing(false); setReason(""); }}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
