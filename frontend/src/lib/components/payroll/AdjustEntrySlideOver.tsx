import { useEffect, useState } from "react";
import { Button, CurrencyInput, Input, SlideOver, Textarea } from "@/lib/components/ui";
import { formatCurrency } from "@/lib/utils/format";
import type { PayrollEntry } from "@/lib/types/payroll";

export interface AdjustEntrySlideOverProps {
  open: boolean;
  entry: PayrollEntry | null;
  onClose: () => void;
  onSave: (patch: { earnings: PayrollEntry["earnings"]; deductions: PayrollEntry["deductions"]; lopDays: number; notes: string }) => Promise<void>;
}

export function AdjustEntrySlideOver({ open, entry, onClose, onSave }: AdjustEntrySlideOverProps) {
  const [earnings, setEarnings] = useState<PayrollEntry["earnings"]>([]);
  const [deductions, setDeductions] = useState<PayrollEntry["deductions"]>([]);
  const [lopDays, setLopDays] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && entry) {
      setEarnings(entry.earnings);
      setDeductions(entry.deductions);
      setLopDays(entry.lopDays);
      setNotes("");
    }
  }, [open, entry]);

  if (!entry) return null;

  const setEarningAmount = (idx: number, amount: number | null) => {
    setEarnings((prev) => prev.map((l, i) => (i === idx ? { ...l, amount: amount ?? 0, isManualOverride: true } : l)));
  };
  const setDeductionAmount = (idx: number, amount: number | null) => {
    setDeductions((prev) => prev.map((l, i) => (i === idx ? { ...l, amount: amount ?? 0, isManualOverride: true } : l)));
  };

  const grossEarnings = earnings.reduce((n, l) => n + l.amount, 0);
  const totalDeductions = deductions.reduce((n, l) => n + l.amount, 0);
  const netPay = grossEarnings - totalDeductions;

  const submit = async () => {
    if (!notes.trim()) return;
    setSaving(true);
    try {
      await onSave({ earnings, deductions, lopDays, notes: notes.trim() });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      width="md"
      title={`Adjust — ${entry.employeeName}`}
      description={`${entry.employeeCode} · ${entry.structureName}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={saving} disabled={!notes.trim()}>Save adjustment</Button>
        </>
      }
    >
      <div className="space-y-5">
        <Input
          label="LOP days"
          type="number"
          value={String(lopDays)}
          onChange={(e) => setLopDays(Math.max(0, Number(e.target.value)))}
        />
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Earnings</p>
          <div className="space-y-3">
            {earnings.map((l, i) => (
              <CurrencyInput key={l.componentId} label={l.componentName} value={l.amount} onChange={(v) => setEarningAmount(i, v)} min={0} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Deductions</p>
          <div className="space-y-3">
            {deductions.map((l, i) => (
              <CurrencyInput key={l.componentId} label={l.componentName} value={l.amount} onChange={(v) => setDeductionAmount(i, v)} min={0} />
            ))}
          </div>
        </div>
        <div className="rounded-md border border-[#E5E5E3] p-3 text-[13px] flex items-center justify-between">
          <span className="text-[#6B6B6B]">Recalculated net pay</span>
          <span className="font-semibold tabular-nums">{formatCurrency(netPay)}</span>
        </div>
        <Textarea label="Reason for adjustment (required)" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </SlideOver>
  );
}
