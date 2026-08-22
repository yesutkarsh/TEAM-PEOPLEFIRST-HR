import { Input } from "@/lib/components/ui";
import type { FieldComponentProps } from "./types";

export function NumberField({ field, value, onChange, disabled }: FieldComponentProps) {
  return (
    <Input
      type="number"
      value={(value as string | number) ?? ""}
      placeholder={field.placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
    />
  );
}
