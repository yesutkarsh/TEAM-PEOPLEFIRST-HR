import { TimePicker } from "@/lib/components/ui";
import type { FieldComponentProps } from "./types";

export function TimeField({ value, onChange, disabled }: FieldComponentProps) {
  return <TimePicker value={(value as string) ?? ""} onChange={onChange} disabled={disabled} />;
}
