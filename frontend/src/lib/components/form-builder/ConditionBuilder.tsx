/** Conditional-logic editor: effect + and/or logic + rules referencing other fields. */
import { Button, Select } from "@/lib/components/ui";
import type { Condition, ConditionOperator, FormField, FormSchema } from "@/lib/types/formSchema";
import { detectCircularConditions } from "@/lib/utils/formConditions";

const EFFECT_OPTIONS = [
  { value: "show", label: "Show this field when…" },
  { value: "hide", label: "Hide this field when…" },
  { value: "require", label: "Require this field when…" },
  { value: "make_optional", label: "Make this field optional when…" },
];

const OPERATOR_OPTIONS: { value: ConditionOperator; label: string }[] = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "greater_than", label: "is greater than" },
  { value: "less_than", label: "is less than" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

function allFields(schema: FormSchema): FormField[] {
  const out: FormField[] = [];
  const collect = (fields: FormField[]) => {
    for (const f of fields) {
      out.push(f);
      if (f.fields?.length) collect(f.fields);
    }
  };
  schema.steps.forEach((s) => collect(s.fields));
  return out;
}

export function ConditionBuilder({
  field,
  schema,
  onChange,
}: {
  field: FormField;
  schema: FormSchema;
  onChange: (condition: Condition | undefined) => void;
}) {
  const condition = field.condition;
  const otherFields = allFields(schema).filter((f) => f.id !== field.id);

  const enable = () => onChange({ effect: "show", logic: "and", rules: [{ fieldId: otherFields[0]?.id ?? "", operator: "equals", value: "" }] });
  const disable = () => onChange(undefined);

  const setCondition = (patch: Partial<Condition>) => {
    if (!condition) return;
    onChange({ ...condition, ...patch });
  };

  const updateRule = (i: number, patch: Partial<Condition["rules"][number]>) => {
    if (!condition) return;
    setCondition({ rules: condition.rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
  };
  const addRule = () => {
    if (!condition) return;
    setCondition({ rules: [...condition.rules, { fieldId: otherFields[0]?.id ?? "", operator: "equals", value: "" }] });
  };
  const removeRule = (i: number) => {
    if (!condition) return;
    setCondition({ rules: condition.rules.filter((_, idx) => idx !== i) });
  };

  const circular = condition ? detectCircularConditions(schema).includes(field.id) : false;

  if (!condition) {
    return (
      <div className="rounded-md border border-dashed border-[#E5E5E3] p-3">
        <Button size="sm" variant="secondary" onClick={enable} disabled={otherFields.length === 0}>
          + Add conditional logic
        </Button>
        {otherFields.length === 0 && (
          <p className="mt-2 text-[12px] text-[#6B6B6B]">Add other fields first to reference them in a condition.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-[#E5E5E3] p-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-[#0A0A0A]">Conditional logic</p>
        <button type="button" onClick={disable} className="text-[12px] text-[#6B6B6B] hover:text-[#DC2626]">Remove</button>
      </div>
      <Select options={EFFECT_OPTIONS} value={condition.effect} onChange={(e) => setCondition({ effect: e.target.value as Condition["effect"] })} />
      {condition.rules.length > 1 && (
        <Select
          options={[{ value: "and", label: "Match ALL rules (AND)" }, { value: "or", label: "Match ANY rule (OR)" }]}
          value={condition.logic}
          onChange={(e) => setCondition({ logic: e.target.value as "and" | "or" })}
        />
      )}
      <div className="space-y-2">
        {condition.rules.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto] gap-2 items-start">
            <div className="grid grid-cols-3 gap-2">
              <Select
                options={otherFields.map((f) => ({ value: f.id, label: f.label || "Untitled" }))}
                value={r.fieldId}
                onChange={(e) => updateRule(i, { fieldId: e.target.value })}
              />
              <Select
                options={OPERATOR_OPTIONS}
                value={r.operator}
                onChange={(e) => updateRule(i, { operator: e.target.value as ConditionOperator })}
              />
              {r.operator !== "is_empty" && r.operator !== "is_not_empty" ? (
                <input
                  className="h-11 rounded-sm border border-[#E5E5E3] px-3 text-[15px] outline-none focus:border-[#0A0A0A]"
                  value={String(r.value)}
                  onChange={(e) => updateRule(i, { value: e.target.value })}
                />
              ) : <span />}
            </div>
            <button type="button" onClick={() => removeRule(i)} aria-label="Remove condition rule" className="text-[#6B6B6B] hover:text-[#DC2626] text-lg leading-none px-1">×</button>
          </div>
        ))}
      </div>
      <Button size="sm" variant="secondary" onClick={addRule} disabled={otherFields.length === 0}>+ Add rule</Button>
      {circular && (
        <p role="alert" className="text-[13px] text-[#B91C1C]">⚠ This creates a circular dependency.</p>
      )}
    </div>
  );
}
