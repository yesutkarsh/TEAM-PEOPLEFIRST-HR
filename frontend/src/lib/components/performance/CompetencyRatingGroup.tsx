import { RatingInput } from "./RatingInput";
import type { Competency, RatingScale } from "@/lib/types/performance";

export interface CompetencyRatingGroupProps {
  competencies: Competency[];
  scale: RatingScale;
  values: Record<string, number | undefined>;
  onChange: (competencyId: string, value: number) => void;
  disabled?: boolean;
}

export function CompetencyRatingGroup({ competencies, scale, values, onChange, disabled }: CompetencyRatingGroupProps) {
  return (
    <div className="divide-y divide-[#E5E5E3]">
      {competencies.map((c) => (
        <div key={c.id} className="py-3 flex flex-col md:flex-row md:items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-[#0A0A0A]">{c.name}</p>
            <p className="text-[12px] text-[#6B6B6B]">{c.description}</p>
          </div>
          <RatingInput scale={scale} value={values[c.id]} onChange={(v) => onChange(c.id, v)} disabled={disabled} />
        </div>
      ))}
    </div>
  );
}
