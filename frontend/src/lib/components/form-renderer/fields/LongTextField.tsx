import { Textarea } from "@/lib/components/ui";
import type { FieldComponentProps } from "./types";

export function LongTextField({ field, value, onChange, disabled }: FieldComponentProps) {
  return (
    <Textarea
      value={(value as string) ?? ""}
      placeholder={field.placeholder}
      rows={field.rows ?? 4}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
