import { PhoneInput } from "@/lib/components/ui";
import type { FieldComponentProps } from "./types";

export function PhoneField({ value, onChange }: FieldComponentProps) {
  return <PhoneInput value={(value as string) ?? ""} onChange={onChange} />;
}
