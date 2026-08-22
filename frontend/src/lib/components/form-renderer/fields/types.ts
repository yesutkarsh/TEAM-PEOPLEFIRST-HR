import type { FormField } from "@/lib/types/formSchema";

export interface FieldComponentProps {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  disabled?: boolean;
}
