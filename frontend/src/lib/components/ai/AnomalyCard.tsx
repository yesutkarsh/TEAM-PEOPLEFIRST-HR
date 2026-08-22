/** Single AI-detected payroll anomaly with confidence, dismiss flow, and employee link. */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Badge, Button, Textarea } from "@/lib/components/ui";
import type { PayrollAnomaly } from "@/lib/types/ai";

export interface AnomalyCardProps {
  anomaly: PayrollAnomaly;
  onDismiss: (id: string, reason: string) => Promise<void> | void;
  dismissed?: boolean;
}

export function AnomalyCard({ anomaly, onDismiss, dismissed }: AnomalyCardProps) {
  const [dismissing, setDismissing] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = reason.trim().length >= 10;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    await onDismiss(anomaly.id, reason.trim());
    setBusy(false);
    setDismissing(false);
  };

  return (
    <div className="rounded-md border border-[#E5E5E3] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-medium text-[#0A0A0A]">
            {anomaly.employee.firstName} {anomaly.employee.lastName}
            <span className="text-[12px] text-[#6B6B6B] font-normal"> · {anomaly.anomalyType}</span>
          </p>
          <p className="mt-1 text-[13px] text-[#6B6B6B] leading-relaxed">{anomaly.explanation}</p>
          {dismissed && anomaly.dismissedReason && (
            <p className="mt-2 text-[12px] text-[#6B6B6B]">Dismissed: {anomaly.dismissedReason}</p>
          )}
        </div>
        <Badge variant="default" className={anomaly.confidence === "high" ? "border border-[#9CA3AF] text-[#3F3F46]" : "border border-[#F59E0B] text-[#B45309] bg-transparent"}>
          {anomaly.confidence === "high" ? "High confidence" : "Medium confidence"}
        </Badge>
      </div>

      {!dismissed && (
        <div className="mt-3 flex items-center gap-4">
          <Link
            to="/employees/$employeeId"
            params={{ employeeId: anomaly.employeeId }}
            className="text-[13px] font-medium text-[var(--tenant-primary)] hover:underline"
          >
            View employee →
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
            hint="This note is kept for reference; the anomaly is not deleted."
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
