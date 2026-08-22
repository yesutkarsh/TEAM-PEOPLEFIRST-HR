import { DatePicker } from "@/lib/components/ui";
import type { FieldComponentProps } from "./types";

export function DateField({ field, value, onChange }: FieldComponentProps) {
  return (
    <DatePicker
      value={(value as string) ?? ""}
      onChange={onChange}
      minDate={field.minDate}
      maxDate={field.maxDate}
    />
  );
}
