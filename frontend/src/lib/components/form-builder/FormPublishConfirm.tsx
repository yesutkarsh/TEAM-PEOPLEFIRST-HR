/** Confirmation dialog for publishing a form; blocks on 0 fields or circular conditions. */
import { ConfirmDialog } from "@/lib/components/ui";
import { countFields } from "@/lib/api/forms";
import { detectCircularConditions } from "@/lib/utils/formConditions";
import type { FormSchema } from "@/lib/types/formSchema";

export function FormPublishConfirm({
  schema,
  open,
  onOpenChange,
  onConfirm,
}: {
  schema: FormSchema;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
}) {
  const fieldCount = countFields(schema);
  const circular = detectCircularConditions(schema);
  const blocked = fieldCount === 0 || circular.length > 0;

  const description = fieldCount === 0
    ? "This form has no fields yet. Add at least one field before publishing."
    : circular.length > 0
      ? "This form has circular conditional logic that must be resolved before publishing."
      : `This form has ${fieldCount} field${fieldCount === 1 ? "" : "s"}. Publishing makes it available immediately and creates an immutable version.`;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Publish this form?"
      description={description}
      confirmLabel={blocked ? "Resolve issues first" : "Publish"}
      variant={blocked ? "warning" : "default"}
      onConfirm={async () => {
        if (blocked) return;
        await onConfirm();
      }}
    />
  );
}
