import { Select } from "@/lib/components/ui";
import type { FieldComponentProps } from "./types";

export function DropdownField({ field, value, onChange, disabled }: FieldComponentProps) {
  return (
    <Select
      value={(value as string) ?? ""}
      disabled={disabled}
      placeholder={field.placeholder ?? "Select…"}
      options={(field.options ?? []).map((o) => ({ value: o.value, label: o.label }))}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
