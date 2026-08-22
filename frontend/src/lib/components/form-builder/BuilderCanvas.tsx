/** Center panel: ordered list of fields for the active step. */
import { useRef } from "react";
import { EmptyState } from "@/lib/components/ui";
import type { FormField, FormStep } from "@/lib/types/formSchema";
import { FieldBlock } from "./FieldBlock";

export function BuilderCanvas({
  step,
  selectedFieldId,
  onSelectField,
  onReorder,
  onDuplicate,
  onDelete,
}: {
  step: FormStep;
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  onReorder: (fields: FormField[]) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const dragIndex = useRef<number | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= step.fields.length || from === to) return;
    const next = [...step.fields];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onReorder(next.map((f, i) => ({ ...f, displayOrder: i })));
  };

  if (step.fields.length === 0) {
    return (
      <EmptyState
        title="No fields yet"
        subtitle="Click a field type from the left panel to add it to this step."
      />
    );
  }

  return (
    <div className="space-y-2">
      {step.fields.map((field, i) => (
        <FieldBlock
          key={field.id}
          field={field}
          selected={field.id === selectedFieldId}
          onSelect={() => onSelectField(field.id)}
          onDuplicate={() => onDuplicate(field.id)}
          onDelete={() => onDelete(field.id)}
          onMoveUp={() => move(i, i - 1)}
          onMoveDown={() => move(i, i + 1)}
          canMoveUp={i > 0}
          canMoveDown={i < step.fields.length - 1}
          draggable
          onDragStart={() => { dragIndex.current = i; }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragIndex.current !== null) move(dragIndex.current, i);
            dragIndex.current = null;
          }}
        />
      ))}
    </div>
  );
}
