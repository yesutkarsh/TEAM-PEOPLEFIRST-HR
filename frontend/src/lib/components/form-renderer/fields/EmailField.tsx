import { Input } from "@/lib/components/ui";
import type { FieldComponentProps } from "./types";

export function EmailField({ field, value, onChange, disabled }: FieldComponentProps) {
  return (
    <Input
      type="email"
      value={(value as string) ?? ""}
      placeholder={field.placeholder ?? "name@example.com"}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
