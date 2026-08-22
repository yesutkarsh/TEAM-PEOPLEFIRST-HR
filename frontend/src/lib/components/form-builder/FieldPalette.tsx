/** Left panel: click a field type to append it to the active step. */
import { FIELD_TYPE_GLYPHS, FIELD_TYPE_GROUPS, FIELD_TYPE_LABELS, type FieldType } from "@/lib/types/formSchema";

export function FieldPalette({ onAdd }: { onAdd: (type: FieldType) => void }) {
  return (
    <div className="w-64 shrink-0 space-y-5 overflow-y-auto">
      {FIELD_TYPE_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">{group.label}</p>
          <div className="space-y-1">
            {group.types.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onAdd(type)}
                className="flex w-full items-center gap-2.5 rounded-md border border-[#E5E5E3] bg-white px-3 py-2 text-left text-[13px] text-[#0A0A0A] hover:border-[#0A0A0A] hover:bg-[#F2F2F0] transition-colors"
              >
                <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-[#F2F2F0] text-[13px]">{FIELD_TYPE_GLYPHS[type]}</span>
                {FIELD_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
