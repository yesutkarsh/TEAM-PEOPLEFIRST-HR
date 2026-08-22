/**
 * AI-detected payroll anomalies for a run. Signals only — never blocks payroll progression.
 * Note: `listPayrollAnomalies` is seeded off employees with payroll history in the mock API;
 * an employee with no payroll history simply produces no anomaly entries for any run.
 */
import { useEffect, useState } from "react";
import { EmptyState } from "@/lib/components/ui";
import { PermissionGuard } from "@/lib/components/rbac";
import { dismissAnomaly, listPayrollAnomalies } from "@/lib/api/ai";
import type { PayrollAnomaly } from "@/lib/types/ai";
import { AiBadge } from "./AiBadge";
import { AnomalyCard } from "./AnomalyCard";

export interface PayrollAnomalySectionProps {
  runId: string;
}

export function PayrollAnomalySection({ runId }: PayrollAnomalySectionProps) {
  const [anomalies, setAnomalies] = useState<PayrollAnomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDismissed, setShowDismissed] = useState(false);

  const load = () => {
    setLoading(true);
    void listPayrollAnomalies(runId).then((r) => {
      setAnomalies(r.data ?? []);
      setLoading(false);
    });
  };
  useEffect(load, [runId]);

  const handleDismiss = async (id: string, reason: string) => {
    const r = await dismissAnomaly(id, reason);
    if (r.data) setAnomalies(r.data.filter((a) => a.runId === runId || runId === "run_current"));
  };

  const open = anomalies.filter((a) => a.status !== "dismissed");
  const dismissed = anomalies.filter((a) => a.status === "dismissed");

  return (
    <PermissionGuard permission="ai.review_anomalies">
      <div className="rounded-md border border-[#E5E5E3] bg-white p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">AI-detected anomalies</h3>
            <AiBadge />
          </div>
          <button type="button" onClick={load} className="text-[13px] text-[#6B6B6B] hover:text-[#0A0A0A]">
            Refresh analysis ↻
          </button>
        </div>
        <p className="text-[12px] text-[#6B6B6B]">
          These are signals for a human to review — they do not block payroll processing.
        </p>

        {loading ? null : open.length === 0 ? (
          <EmptyState title="No anomalies detected" subtitle="This run looks consistent with prior history." />
        ) : (
          <div className="space-y-3">
            {open.map((a) => (
              <AnomalyCard key={a.id} anomaly={a} onDismiss={handleDismiss} />
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
                {dismissed.map((a) => (
                  <AnomalyCard key={a.id} anomaly={a} onDismiss={handleDismiss} dismissed />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
