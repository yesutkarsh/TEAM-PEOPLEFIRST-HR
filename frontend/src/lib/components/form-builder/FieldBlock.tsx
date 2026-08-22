/** Single field row in the builder canvas: select / duplicate / delete / reorder. */
import { FIELD_TYPE_GLYPHS, FIELD_TYPE_LABELS, type FormField } from "@/lib/types/formSchema";
import { cn } from "@/lib/utils";

export function FieldBlock({
  field,
  selected,
  onSelect,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  field: FormField;
  selected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
      className={cn(
        "group flex items-start gap-3 rounded-md border bg-white p-3 cursor-pointer transition-colors",
        selected ? "border-[#0A0A0A] ring-1 ring-[#0A0A0A]" : "border-[#E5E5E3] hover:border-[#0A0A0A]/40",
      )}
    >
      <span aria-hidden className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-[#F2F2F0] text-[13px]">
        {FIELD_TYPE_GLYPHS[field.type]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-[#0A0A0A]">
          {field.label || "Untitled"}
          {field.required && <span className="ml-1 text-[#DC2626]">*</span>}
        </p>
        <p className="text-[12px] text-[#6B6B6B]">
          {FIELD_TYPE_LABELS[field.type]}
          {field.condition ? " · conditional" : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" aria-label="Move up" disabled={!canMoveUp} onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="disabled:opacity-30 px-1 text-[13px]">↑</button>
        <button type="button" aria-label="Move down" disabled={!canMoveDown} onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="disabled:opacity-30 px-1 text-[13px]">↓</button>
        <button type="button" aria-label="Duplicate field" onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="px-1 text-[13px]">⧉</button>
        <button type="button" aria-label="Delete field" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="px-1 text-[13px] text-[#6B6B6B] hover:text-[#DC2626]">×</button>
      </div>
    </div>
  );
}
