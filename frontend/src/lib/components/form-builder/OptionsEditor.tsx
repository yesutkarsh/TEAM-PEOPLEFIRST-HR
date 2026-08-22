/** Editor for FieldOption[] used by dropdown/radio/checkbox_group/multi_select fields. */
import { Button, Input } from "@/lib/components/ui";
import { shortId } from "@/lib/utils/localStorage";
import type { FieldOption } from "@/lib/types/formSchema";

export function OptionsEditor({
  options,
  onChange,
}: {
  options: FieldOption[];
  onChange: (options: FieldOption[]) => void;
}) {
  const update = (id: string, patch: Partial<FieldOption>) => {
    onChange(options.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };
  const add = () => {
    const n = options.length + 1;
    onChange([...options, { id: shortId(8), label: `Option ${n}`, value: `option_${n}` }]);
  };
  const remove = (id: string) => onChange(options.filter((o) => o.id !== id));

  return (
    <div className="space-y-2">
      <p className="text-[13px] font-medium text-[#0A0A0A]">Options</p>
      <div className="space-y-2">
        {options.map((o) => (
          <div key={o.id} className="flex items-center gap-2">
            <Input
              value={o.label}
              onChange={(e) => update(o.id, { label: e.target.value, value: e.target.value.trim().toLowerCase().replace(/\s+/g, "_") || o.value })}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => remove(o.id)}
              aria-label={`Remove ${o.label}`}
              className="text-[#6B6B6B] hover:text-[#DC2626] transition-colors text-lg leading-none px-1"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <Button size="sm" variant="secondary" onClick={add}>+ Add option</Button>
    </div>
  );
}
