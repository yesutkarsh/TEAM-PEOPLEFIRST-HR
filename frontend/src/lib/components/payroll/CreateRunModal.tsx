import { useEffect, useState } from "react";
import { Button, Select, SlideOver, Textarea } from "@/lib/components/ui";
import { monthOptions } from "@/lib/api/payroll";

export interface CreateRunModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { month: number; year: number; notes?: string }) => Promise<void>;
}

export function CreateRunModal({ open, onClose, onCreate }: CreateRunModalProps) {
  const options = monthOptions(12);
  const [value, setValue] = useState(options[0]?.value ?? "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setValue(options[0]?.value ?? "");
      setNotes("");
      setError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    if (!value) return;
    const [year, month] = value.split("-").map(Number);
    setSaving(true);
    setError(undefined);
    try {
      await onCreate({ month, year, notes: notes.trim() || undefined });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create payroll run.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      width="sm"
      title="Create payroll run"
      description="Pick the month you want to run payroll for. All active employees will be included."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={saving}>Create run</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-[13px] text-[#DC2626]">{error}</p>}
        <Select label="Month" value={value} onChange={(e) => setValue(e.target.value)} options={options} />
        <Textarea label="Notes (optional)" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </SlideOver>
  );
}
