import { Input } from "@/lib/components/ui";
import type { FieldComponentProps } from "./types";

export function ShortTextField({ field, value, onChange, disabled }: FieldComponentProps) {
  return (
    <Input
      value={(value as string) ?? ""}
      placeholder={field.placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
