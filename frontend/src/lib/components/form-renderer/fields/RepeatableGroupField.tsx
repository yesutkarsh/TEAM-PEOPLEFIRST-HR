import { Button } from "@/lib/components/ui";
import { validateField } from "@/lib/utils/formConditions";
import { uuid } from "@/lib/utils/localStorage";
import { FormFieldRenderer } from "../FormFieldRenderer";
import type { FieldComponentProps } from "./types";

type Row = Record<string, unknown> & { _rowId?: string };

export function RepeatableGroupField({ field, value, onChange, disabled }: FieldComponentProps) {
  const rows = Array.isArray(value) ? (value as Row[]) : [];
  const subFields = field.fields ?? [];
  const maxRows = field.maxRows ?? Infinity;
  const minRows = field.minRows ?? 0;

  const addRow = () => {
    if (rows.length >= maxRows) return;
    onChange([...rows, { _rowId: uuid() }]);
  };
  const removeRow = (idx: number) => {
    if (rows.length <= minRows) return;
    onChange(rows.filter((_, i) => i !== idx));
  };
  const updateRow = (idx: number, fieldId: string, v: unknown) => {
    onChange(rows.map((row, i) => (i === idx ? { ...row, [fieldId]: v } : row)));
  };

  return (
    <div className="space-y-4">
      {rows.map((row, idx) => (
        <div key={row._rowId ?? idx} className="rounded-md border border-[#E5E5E3] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-[#6B6B6B]">Entry {idx + 1}</span>
            {!disabled && rows.length > minRows && (
              <button
                type="button"
                onClick={() => removeRow(idx)}
                className="text-[12px] text-[#DC2626] hover:underline"
              >
                Remove
              </button>
            )}
          </div>
          {subFields.map((sub) => (
            <FormFieldRenderer
              key={sub.id}
              field={sub}
              value={row[sub.id]}
              onChange={(v) => updateRow(idx, sub.id, v)}
              error={validateField(sub, row[sub.id], row) ?? undefined}
              disabled={disabled}
              formValues={row}
            />
          ))}
        </div>
      ))}
      {!disabled && rows.length < maxRows && (
        <Button type="button" variant="secondary" size="sm" onClick={addRow}>
          + Add entry
        </Button>
      )}
    </div>
  );
}
