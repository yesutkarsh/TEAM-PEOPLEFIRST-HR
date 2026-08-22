import { MultiSelect } from "@/lib/components/ui";
import type { FieldComponentProps } from "./types";

export function MultiSelectField({ field, value, onChange }: FieldComponentProps) {
  return (
    <MultiSelect
      options={(field.options ?? []).map((o) => ({ value: o.value, label: o.label }))}
      value={Array.isArray(value) ? (value as string[]) : []}
      onChange={onChange}
    />
  );
}
