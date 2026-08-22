import { RadioGroup } from "@/lib/components/ui";
import type { FieldComponentProps } from "./types";

export function RadioField({ field, value, onChange }: FieldComponentProps) {
  return (
    <RadioGroup
      options={(field.options ?? []).map((o) => ({ value: o.value, label: o.label }))}
      value={(value as string) ?? ""}
      onChange={onChange}
    />
  );
}
