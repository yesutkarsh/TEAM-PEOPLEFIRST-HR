import { RadioGroup } from "@/lib/components/ui";
import type { FieldComponentProps } from "./types";

export function YesNoField({ value, onChange }: FieldComponentProps) {
  return (
    <RadioGroup
      orientation="horizontal"
      options={[
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ]}
      value={value === true ? "true" : value === false ? "false" : ""}
      onChange={(v) => onChange(v === "true")}
    />
  );
}
