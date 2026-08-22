import { useState } from "react";
import { Card, Input, Toggle, Button, Checkbox, Select } from "@/lib/components/ui";
import { FormQuestionItem, QUESTION_TYPE_OPTIONS } from "./FormQuestionItem";
import type { Competency, FormQuestion, FormQuestionType, FormSection } from "@/lib/types/performance";

export interface FormSectionBlockProps {
  section: FormSection;
  competencies: Competency[];
  goalBlockUsedElsewhere: boolean;
  onChange: (next: FormSection) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}

const RESPONDENTS: FormSection["respondents"] = ["self", "manager", "peer"];

export function FormSectionBlock({
  section, competencies, goalBlockUsedElsewhere, onChange, onRemove, onMove,
}: FormSectionBlockProps) {
  const [newType, setNewType] = useState<FormQuestionType>("rating");

  const addQuestion = () => {
    // Only one goal-review block is allowed across the whole form.
    if (newType === "goal_review" && goalBlockUsedElsewhere) return;
    const q: FormQuestion = {
      id: `q_${Math.random().toString(36).slice(2, 9)}`,
      type: newType,
      label: newType === "goal_review" ? "Goal achievement" : "New question",
      required: false,
      displayOrder: section.questions.length,
      competencyIds: newType === "competency_group" ? [] : undefined,
    };
    onChange({ ...section, questions: [...section.questions, q] });
  };

  const moveQ = (idx: number, dir: -1 | 1) => {
    const next = [...section.questions];
    const t = idx + dir;
    if (t < 0 || t >= next.length) return;
    [next[idx], next[t]] = [next[t], next[idx]];
    onChange({ ...section, questions: next.map((q, i) => ({ ...q, displayOrder: i })) });
  };

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-[#9CA3AF] cursor-grab select-none">≡</span>
        <Input
          value={section.title}
          onChange={(e) => onChange({ ...section, title: e.target.value })}
          className="flex-1"
          aria-label="Section title"
        />
        <Button size="sm" variant="ghost" onClick={() => onMove(-1)} aria-label="Move section up">↑</Button>
        <Button size="sm" variant="ghost" onClick={() => onMove(1)} aria-label="Move section down">↓</Button>
        <Button size="sm" variant="ghost" onClick={onRemove}>Remove</Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Toggle
          checked={section.isConfidential}
          onChange={(v) => onChange({ ...section, isConfidential: v })}
          size="sm"
          label="Confidential"
        />
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-[#6B6B6B]">Respondents:</span>
          {RESPONDENTS.map((r) => (
            <Checkbox
              key={r}
              checked={section.respondents.includes(r)}
              onChange={(e) =>
                onChange({
                  ...section,
                  respondents: e.target.checked
                    ? [...section.respondents, r]
                    : section.respondents.filter((x) => x !== r),
                })
              }
              label={r[0].toUpperCase() + r.slice(1)}
            />
          ))}
        </div>
      </div>

      {section.isConfidential && (
        <p className="rounded-md bg-[#FEF3C7] border border-[#FCD34D] px-3 py-2 text-[12px] text-[#92400E]">
          Responses visible to HR only — not shared with the employee.
        </p>
      )}

      <div className="space-y-2">
        {section.questions.map((q, i) => (
          <FormQuestionItem
            key={q.id}
            question={q}
            competencies={competencies}
            onChange={(next) => onChange({ ...section, questions: section.questions.map((x) => (x.id === q.id ? next : x)) })}
            onRemove={() => onChange({ ...section, questions: section.questions.filter((x) => x.id !== q.id) })}
            onMove={(d) => moveQ(i, d)}
          />
        ))}
      </div>

      <div className="flex items-end gap-2">
        <Select
          className="max-w-56"
          value={newType}
          onChange={(e) => setNewType(e.target.value as FormQuestionType)}
          options={QUESTION_TYPE_OPTIONS.filter((o) => o.value !== "goal_review" || !goalBlockUsedElsewhere)}
        />
        <Button size="sm" variant="secondary" onClick={addQuestion}>Add question</Button>
      </div>
    </Card>
  );
}
