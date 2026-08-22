import { Select, Input, Button } from "@/lib/components/ui";
import { X } from "lucide-react";
import type { FieldDef } from "@/lib/api/reports";
import type { ReportFilter, ReportFilterOperator } from "@/lib/types/reports";

const OPERATORS: { value: ReportFilterOperator; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not equals" },
  { value: "contains", label: "Contains" },
  { value: "greater_than", label: "Greater than" },
  { value: "less_than", label: "Less than" },
  { value: "between", label: "Between" },
  { value: "in", label: "In (comma-separated)" },
];

export function ReportFilterRow({
  fields,
  filter,
  onChange,
  onRemove,
}: {
  fields: FieldDef[];
  filter: ReportFilter;
  onChange: (f: ReportFilter) => void;
  onRemove: () => void;
}) {
  const valueStr = Array.isArray(filter.value) ? filter.value.join(",") : String(filter.value ?? "");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        className="w-40"
        options={fields.map((f) => ({ value: f.key, label: f.label }))}
        value={filter.field}
        onChange={(e) => onChange({ ...filter, field: e.target.value })}
      />
      <Select
        className="w-40"
        options={OPERATORS}
        value={filter.operator}
        onChange={(e) => onChange({ ...filter, operator: e.target.value as ReportFilterOperator })}
      />
      <Input
        className="w-48"
        value={valueStr}
        onChange={(e) => {
          const raw = e.target.value;
          onChange({ ...filter, value: filter.operator === "in" || filter.operator === "between" ? raw.split(",").map((s) => s.trim()) : raw });
        }}
        placeholder="Value"
      />
      <Button variant="ghost" size="sm" onClick={onRemove} aria-label="Remove filter">
        <X size={14} />
      </Button>
    </div>
  );
}
