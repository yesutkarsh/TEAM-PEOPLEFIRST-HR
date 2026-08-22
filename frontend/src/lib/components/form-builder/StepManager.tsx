/** Toggle multi-step mode; add/rename/reorder/delete steps. */
import { Button, Input, Toggle } from "@/lib/components/ui";
import { showToast } from "@/lib/components/ui/Toast";
import { makeStep } from "@/lib/api/forms";
import type { FormSchema, FormStep } from "@/lib/types/formSchema";

export function StepManager({
  schema,
  activeStepId,
  onSelectStep,
  onChange,
}: {
  schema: FormSchema;
  activeStepId: string;
  onSelectStep: (stepId: string) => void;
  onChange: (patch: Partial<FormSchema>) => void;
}) {
  const toggleMultiStep = (checked: boolean) => {
    if (!checked && schema.steps.length > 1) {
      const merged: FormStep = {
        ...schema.steps[0],
        fields: schema.steps.flatMap((s) => s.fields),
      };
      onChange({ isMultiStep: false, steps: [merged] });
      onSelectStep(merged.id);
    } else {
      onChange({ isMultiStep: checked });
    }
  };

  const addStep = () => {
    const step = makeStep(`Step ${schema.steps.length + 1}`);
    onChange({ steps: [...schema.steps, step] });
    onSelectStep(step.id);
  };

  const renameStep = (id: string, title: string) => {
    onChange({ steps: schema.steps.map((s) => (s.id === id ? { ...s, title } : s)) });
  };

  const removeStep = (id: string) => {
    if (schema.steps.length <= 1) {
      showToast("A form needs at least one step.", "error");
      return;
    }
    const next = schema.steps.filter((s) => s.id !== id);
    onChange({ steps: next });
    if (activeStepId === id) onSelectStep(next[0].id);
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = schema.steps.findIndex((s) => s.id === id);
    const target = idx + dir;
    if (target < 0 || target >= schema.steps.length) return;
    const next = [...schema.steps];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange({ steps: next });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-[#0A0A0A]">Multi-step form</span>
        <Toggle checked={schema.isMultiStep} onChange={toggleMultiStep} size="sm" label="Multi-step form" />
      </div>
      {schema.isMultiStep && (
        <div className="space-y-2">
          {schema.steps.map((step, i) => (
            <div
              key={step.id}
              className={`flex items-center gap-2 rounded-md border p-2 ${activeStepId === step.id ? "border-[#0A0A0A]" : "border-[#E5E5E3]"}`}
            >
              <button type="button" onClick={() => onSelectStep(step.id)} className="text-[12px] text-[#6B6B6B] w-5 shrink-0">{i + 1}</button>
              <Input value={step.title} onChange={(e) => renameStep(step.id, e.target.value)} className="flex-1" />
              <button type="button" onClick={() => move(step.id, -1)} disabled={i === 0} aria-label="Move step up" className="disabled:opacity-30 px-1">↑</button>
              <button type="button" onClick={() => move(step.id, 1)} disabled={i === schema.steps.length - 1} aria-label="Move step down" className="disabled:opacity-30 px-1">↓</button>
              <button type="button" onClick={() => removeStep(step.id)} aria-label="Delete step" className="text-[#6B6B6B] hover:text-[#DC2626] text-lg leading-none px-1">×</button>
            </div>
          ))}
          <Button size="sm" variant="secondary" onClick={addStep}>+ Add step</Button>
        </div>
      )}
    </div>
  );
}
