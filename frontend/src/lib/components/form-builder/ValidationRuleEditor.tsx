/** Editor for ValidationRule[] on a FormField. */
import { Button, Input, Select } from "@/lib/components/ui";
import type { ValidationRule } from "@/lib/types/formSchema";

const TYPE_OPTIONS = [
  { value: "min", label: "Minimum value" },
  { value: "max", label: "Maximum value" },
  { value: "min_length", label: "Minimum length" },
  { value: "max_length", label: "Maximum length" },
  { value: "pattern", label: "Pattern (regex)" },
  { value: "custom", label: "Custom (regex)" },
];

export function ValidationRuleEditor({
  rules,
  onChange,
}: {
  rules: ValidationRule[];
  onChange: (rules: ValidationRule[]) => void;
}) {
  const update = (i: number, patch: Partial<ValidationRule>) => {
    onChange(rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const add = () => onChange([...rules, { type: "min_length", value: "", message: "This value is invalid." }]);
  const remove = (i: number) => onChange(rules.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <p className="text-[13px] font-medium text-[#0A0A0A]">Validation rules</p>
      <div className="space-y-3">
        {rules.map((r, i) => (
          <div key={i} className="rounded-md border border-[#E5E5E3] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Select
                options={TYPE_OPTIONS}
                value={r.type}
                onChange={(e) => update(i, { type: e.target.value as ValidationRule["type"] })}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Remove rule"
                className="text-[#6B6B6B] hover:text-[#DC2626] transition-colors text-lg leading-none px-1"
              >
                ×
              </button>
            </div>
            <Input
              label="Value"
              value={String(r.value)}
              onChange={(e) => update(i, { value: e.target.value })}
            />
            <Input
              label="Error message"
              value={r.message}
              onChange={(e) => update(i, { message: e.target.value })}
            />
          </div>
        ))}
      </div>
      <Button size="sm" variant="secondary" onClick={add}>+ Add validation rule</Button>
    </div>
  );
}
