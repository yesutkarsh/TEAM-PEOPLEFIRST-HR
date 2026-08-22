/** Bar chart of calibrated-rating counts against a rating scale. */
import type { RatingScale } from "@/lib/types/performance";

export interface CalibrationRatingDistributionProps {
  scale: RatingScale;
  ratings: number[];
}

export function CalibrationRatingDistribution({ scale, ratings }: CalibrationRatingDistributionProps) {
  const counts = scale.labels.map((l) => ratings.filter((r) => Math.round(r) === l.value).length);
  const max = Math.max(1, ...counts);
  return (
    <div className="space-y-2.5">
      {scale.labels.map((l, i) => (
        <div key={l.value} className="flex items-center gap-3">
          <span className="w-36 shrink-0 text-[12px] text-[#6B6B6B] truncate">{l.value} — {l.label}</span>
          <div className="flex-1 h-3 rounded-full bg-[#F2F2F0] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${(counts[i] / max) * 100}%`, background: l.color ?? "var(--tenant-primary)" }}
            />
          </div>
          <span className="w-6 text-right text-[12px] tabular-nums text-[#0A0A0A]">{counts[i]}</span>
        </div>
      ))}
    </div>
  );
}
