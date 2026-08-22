/** Editor for repeatable_group settings: min/max rows + nested sub-fields. */
import { Button, Input } from "@/lib/components/ui";
import { FIELD_TYPE_GROUPS, FIELD_TYPE_LABELS, type FormField } from "@/lib/types/formSchema";
import { makeField } from "@/lib/api/forms";

export function RepeatableGroupEditor({
  field,
  onChange,
}: {
  field: FormField;
  onChange: (patch: Partial<FormField>) => void;
}) {
  const subFields = field.fields ?? [];

  const addSubField = (type: FormField["type"]) => {
    onChange({ fields: [...subFields, makeField(type, subFields.length)] });
  };
  const updateSubField = (id: string, patch: Partial<FormField>) => {
    onChange({ fields: subFields.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  };
  const removeSubField = (id: string) => {
    onChange({ fields: subFields.filter((f) => f.id !== id) });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input
          type="number"
          label="Minimum rows"
          value={field.minRows ?? 0}
          onChange={(e) => onChange({ minRows: Number(e.target.value) || 0 })}
        />
        <Input
          type="number"
          label="Maximum rows"
          value={field.maxRows ?? 10}
          onChange={(e) => onChange({ maxRows: Number(e.target.value) || 1 })}
        />
      </div>
      <div>
        <p className="text-[13px] font-medium text-[#0A0A0A] mb-2">Fields in each entry</p>
        <div className="space-y-2">
          {subFields.map((sf) => (
            <div key={sf.id} className="flex items-center gap-2 rounded-md border border-[#E5E5E3] p-2">
              <span className="text-[11px] uppercase tracking-[0.06em] text-[#6B6B6B] w-24 shrink-0">{FIELD_TYPE_LABELS[sf.type]}</span>
              <Input value={sf.label} onChange={(e) => updateSubField(sf.id, { label: e.target.value })} className="flex-1" />
              <button type="button" onClick={() => removeSubField(sf.id)} aria-label="Remove sub-field" className="text-[#6B6B6B] hover:text-[#DC2626] text-lg leading-none px-1">×</button>
            </div>
          ))}
          {subFields.length === 0 && <p className="text-[13px] text-[#6B6B6B]">No fields yet — add one below.</p>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {FIELD_TYPE_GROUPS.flatMap((g) => g.types)
            .filter((t) => t !== "repeatable_group")
            .slice(0, 8)
            .map((t) => (
              <Button key={t} size="sm" variant="secondary" onClick={() => addSubField(t)}>
                + {FIELD_TYPE_LABELS[t]}
              </Button>
            ))}
        </div>
      </div>
    </div>
  );
}
