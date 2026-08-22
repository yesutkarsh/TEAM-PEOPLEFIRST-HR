import { Checkbox } from "@/lib/components/ui";
import type { FieldDef } from "@/lib/api/reports";

export function ReportFieldPicker({
  fields,
  selected,
  onChange,
}: {
  fields: FieldDef[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (key: string) => onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  return (
    <div>
      <p className="mb-2 text-[13px] font-medium text-[#0A0A0A]">Fields</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {fields.map((f) => (
          <Checkbox key={f.key} label={f.label} checked={selected.includes(f.key)} onChange={() => toggle(f.key)} />
        ))}
      </div>
    </div>
  );
}
