import { Input, Toggle, Button, Select, MultiSelect } from "@/lib/components/ui";
import type { Competency, FormQuestion } from "@/lib/types/performance";

const TYPE_LABEL = {
  rating: "Rating", text: "Open text", competency_group: "Competency group", goal_review: "Goal review",
} as const;

export interface FormQuestionItemProps {
  question: FormQuestion;
  competencies: Competency[];
  onChange: (next: FormQuestion) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}

export function FormQuestionItem({ question: q, competencies, onChange, onRemove, onMove }: FormQuestionItemProps) {
  return (
    <div className="rounded-md border border-[#E5E5E3] bg-[#FAFAF8] p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-[#9CA3AF] cursor-grab select-none">≡</span>
        <span className="text-[11px] uppercase tracking-wide text-[#6B6B6B]">{TYPE_LABEL[q.type]}</span>
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => onMove(-1)} aria-label="Move up">↑</Button>
          <Button size="sm" variant="ghost" onClick={() => onMove(1)} aria-label="Move down">↓</Button>
          <Button size="sm" variant="ghost" onClick={onRemove}>Remove</Button>
        </div>
      </div>
      {q.type === "goal_review" ? (
        <p className="text-[13px] text-[#6B6B6B]">Auto-populated from the employee's goals for this cycle.</p>
      ) : (
        <>
          <Input value={q.label} onChange={(e) => onChange({ ...q, label: e.target.value })} placeholder="Question label" />
          <Input value={q.helpText ?? ""} onChange={(e) => onChange({ ...q, helpText: e.target.value })} placeholder="Help text (optional)" />
        </>
      )}
      {q.type === "competency_group" && (
        <MultiSelect
          label="Competencies"
          options={competencies.map((c) => ({ value: c.id, label: c.name }))}
          value={q.competencyIds ?? []}
          onChange={(v) => onChange({ ...q, competencyIds: v })}
        />
      )}
      <Toggle checked={q.required} onChange={(v) => onChange({ ...q, required: v })} size="sm" label="Required" />
    </div>
  );
}

export const QUESTION_TYPE_OPTIONS = [
  { value: "rating", label: "Rating question" },
  { value: "text", label: "Open text question" },
  { value: "competency_group", label: "Competency group" },
  { value: "goal_review", label: "Goal review block" },
];

export { Select };
