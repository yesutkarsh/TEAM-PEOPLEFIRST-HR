/** Renders a review form for filling (or read-only viewing). */
import { Card, Textarea } from "@/lib/components/ui";
import { RatingInput } from "./RatingInput";
import { CompetencyRatingGroup } from "./CompetencyRatingGroup";
import { GoalProgressRing } from "./GoalProgressRing";
import type {
  Competency, FormSection, Objective, RatingScale, ReviewResponse,
} from "@/lib/types/performance";

export interface ReviewFormRendererProps {
  sections: FormSection[];
  respondent: "self" | "manager" | "peer";
  scale: RatingScale;
  competencies: Competency[];
  goals: Objective[];
  responses: ReviewResponse[];
  onChange: (next: ReviewResponse[]) => void;
  readOnly?: boolean;
  /** Managers see confidential sections; employees never do. */
  showConfidential?: boolean;
}

function key(questionId: string, competencyId?: string) {
  return competencyId ? `${questionId}::${competencyId}` : questionId;
}

export function ReviewFormRenderer({
  sections, respondent, scale, competencies, goals, responses, onChange, readOnly, showConfidential = true,
}: ReviewFormRendererProps) {
  const map = new Map(responses.map((r) => [key(r.questionId, r.competencyId), r]));

  const set = (r: ReviewResponse) => {
    const k = key(r.questionId, r.competencyId);
    const next = responses.filter((x) => key(x.questionId, x.competencyId) !== k);
    onChange([...next, r]);
  };

  const visible = sections.filter(
    (s) => s.respondents.includes(respondent) && (showConfidential || !s.isConfidential),
  );

  return (
    <div className="space-y-5">
      {visible.map((sec) => (
        <Card key={sec.id} className="space-y-4">
          <div>
            <h3 className="text-[15px] font-semibold text-[#0A0A0A]">{sec.title}</h3>
            {sec.description && <p className="text-[12px] text-[#6B6B6B] mt-0.5">{sec.description}</p>}
            {sec.isConfidential && (
              <p className="mt-2 rounded-md bg-[#FEF3C7] border border-[#FCD34D] px-3 py-1.5 text-[12px] text-[#92400E]">
                Confidential — visible to HR and managers only.
              </p>
            )}
          </div>

          {sec.questions.map((q) => {
            if (q.type === "goal_review") {
              return (
                <div key={q.id} className="space-y-3">
                  <p className="text-[13px] font-medium text-[#0A0A0A]">{q.label}</p>
                  {/* Edge case 5 — a missing goal set never blocks the review. */}
                  {goals.length === 0 ? (
                    <p className="rounded-md bg-[#FEF3C7] border border-[#FCD34D] px-3 py-2 text-[12px] text-[#92400E]">
                      No goals found for this employee in this cycle period. Proceed with a qualitative review.
                    </p>
                  ) : (
                    goals.map((g) => {
                      const r = map.get(key(q.id, g.id));
                      return (
                        <div key={g.id} className="rounded-md border border-[#E5E5E3] p-3 space-y-2">
                          <div className="flex items-center gap-3">
                            <GoalProgressRing value={g.progress} size={40} />
                            <p className="text-[13px] font-medium text-[#0A0A0A]">{g.title}</p>
                          </div>
                          <RatingInput
                            scale={scale}
                            value={r?.rating}
                            disabled={readOnly}
                            onChange={(v) => set({ questionId: q.id, competencyId: g.id, rating: v, text: r?.text })}
                          />
                          <Textarea
                            rows={2}
                            disabled={readOnly}
                            placeholder="Comment on this goal"
                            value={r?.text ?? ""}
                            onChange={(e) => set({ questionId: q.id, competencyId: g.id, rating: r?.rating, text: e.target.value })}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              );
            }

            if (q.type === "competency_group") {
              const comps = competencies.filter((c) => (q.competencyIds ?? []).includes(c.id));
              const values: Record<string, number | undefined> = {};
              comps.forEach((c) => { values[c.id] = map.get(key(q.id, c.id))?.rating; });
              return (
                <div key={q.id}>
                  <p className="text-[13px] font-medium text-[#0A0A0A]">{q.label}{q.required && " *"}</p>
                  {q.helpText && <p className="text-[12px] text-[#6B6B6B]">{q.helpText}</p>}
                  <CompetencyRatingGroup
                    competencies={comps}
                    scale={scale}
                    values={values}
                    disabled={readOnly}
                    onChange={(cid, v) => set({ questionId: q.id, competencyId: cid, rating: v })}
                  />
                </div>
              );
            }

            const r = map.get(key(q.id));
            if (q.type === "rating") {
              return (
                <div key={q.id}>
                  <RatingInput
                    scale={scale}
                    label={`${q.label}${q.required ? " *" : ""}`}
                    value={r?.rating}
                    disabled={readOnly}
                    onChange={(v) => set({ questionId: q.id, rating: v })}
                  />
                  {q.helpText && <p className="mt-1 text-[12px] text-[#6B6B6B]">{q.helpText}</p>}
                </div>
              );
            }
            return (
              <Textarea
                key={q.id}
                label={`${q.label}${q.required ? " *" : ""}`}
                hint={q.helpText}
                rows={4}
                disabled={readOnly}
                value={r?.text ?? ""}
                onChange={(e) => set({ questionId: q.id, text: e.target.value })}
              />
            );
          })}
        </Card>
      ))}
    </div>
  );
}
