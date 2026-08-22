import { Button, SectionDivider } from "./builderBits";
import { FormSectionBlock } from "./FormSectionBlock";
import type { Competency, FormSection, ReviewFormTemplate } from "@/lib/types/performance";

export interface ReviewFormBuilderProps {
  form: ReviewFormTemplate;
  competencies: Competency[];
  onChange: (next: ReviewFormTemplate) => void;
}

export function ReviewFormBuilder({ form, competencies, onChange }: ReviewFormBuilderProps) {
  const goalBlockCount = form.sections.reduce(
    (s, sec) => s + sec.questions.filter((q) => q.type === "goal_review").length,
    0,
  );

  const addSection = () => {
    const sec: FormSection = {
      id: `sec_${Math.random().toString(36).slice(2, 9)}`,
      title: "New section",
      isConfidential: false,
      respondents: ["self", "manager"],
      questions: [],
    };
    onChange({ ...form, sections: [...form.sections, sec] });
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...form.sections];
    const t = idx + dir;
    if (t < 0 || t >= next.length) return;
    [next[idx], next[t]] = [next[t], next[idx]];
    onChange({ ...form, sections: next });
  };

  return (
    <div className="space-y-4">
      <SectionDivider label="Review form" hint="Defines what managers, employees and peers answer." />
      {form.sections.map((sec, i) => (
        <FormSectionBlock
          key={sec.id}
          section={sec}
          competencies={competencies}
          goalBlockUsedElsewhere={goalBlockCount > 0 && !sec.questions.some((q) => q.type === "goal_review")}
          onChange={(next) => onChange({ ...form, sections: form.sections.map((s) => (s.id === sec.id ? next : s)) })}
          onRemove={() => onChange({ ...form, sections: form.sections.filter((s) => s.id !== sec.id) })}
          onMove={(d) => move(i, d)}
        />
      ))}
      <Button size="sm" variant="secondary" onClick={addSection}>Add section</Button>
    </div>
  );
}
