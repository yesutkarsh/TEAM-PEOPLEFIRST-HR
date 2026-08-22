import { Checkbox } from "@/lib/components/ui";
import type { FieldComponentProps } from "./types";

export function CheckboxGroupField({ field, value, onChange, disabled }: FieldComponentProps) {
  const selected = Array.isArray(value) ? (value as string[]) : [];
  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };
  return (
    <div className="space-y-2">
      {(field.options ?? []).map((opt) => (
        <Checkbox
          key={opt.id}
          label={opt.label}
          checked={selected.includes(opt.value)}
          disabled={disabled}
          onChange={() => toggle(opt.value)}
        />
      ))}
    </div>
  );
}
