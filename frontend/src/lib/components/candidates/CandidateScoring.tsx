/** Reviewer scoring — your rating plus the team average. */
import { useCallback, useEffect, useState } from "react";
import { Button, Card, StarRating, Textarea, showToast } from "@/lib/components/ui";
import { authStore } from "@/lib/store/auth";
import { reviewApi } from "@/lib/api/candidates";
import type { CandidateScore } from "@/lib/types/candidate";

export interface CandidateScoringProps {
  pipelineId: string;
}

export function CandidateScoring({ pipelineId }: CandidateScoringProps) {
  const user = authStore.useSelector((s) => s.user);
  const reviewerId = user?.id ?? "hr_admin";
  const reviewerName = user?.fullName ?? "HR Admin";

  const [scores, setScores] = useState<CandidateScore[]>([]);
  const [value, setValue] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    const all = reviewApi.scores(pipelineId);
    setScores(all);
    const mine = all.find((s) => s.reviewerId === reviewerId);
    setValue(mine?.overallScore ?? null);
    setNotes(mine?.notes ?? "");
  }, [pipelineId, reviewerId]);

  useEffect(() => { load(); }, [load]);

  const save = async (score: number, note: string) => {
    setSaving(true);
    const r = await reviewApi.saveScore(pipelineId, score, note, { id: reviewerId, name: reviewerName });
    setSaving(false);
    if (r.error) { showToast(r.error.message, "error"); return; }
    showToast("Rating saved.", "success");
    load();
  };

  const others = scores.filter((s) => s.reviewerId !== reviewerId);
  const avg = scores.length ? scores.reduce((a, s) => a + s.overallScore, 0) / scores.length : null;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-[#0A0A0A]">Scoring</h3>
        {avg !== null && (
          <span className="text-[12px] text-[#6B6B6B]">
            Team average <strong className="text-[#0A0A0A]">{avg.toFixed(1)}</strong> ({scores.length})
          </span>
        )}
      </div>

      <div className="mt-3 space-y-3">
        <StarRating value={value} onChange={(v) => { setValue(v); void save(v, notes); }} size="lg" />
        <Textarea
          label="Your notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What stood out about this candidate?"
        />
        <Button size="sm" variant="secondary" loading={saving} disabled={!value} onClick={() => value && void save(value, notes)}>
          Save notes
        </Button>
      </div>

      {others.length > 0 && (
        <ul className="mt-4 pt-4 border-t border-[#E5E5E3] space-y-3">
          {others.map((s) => (
            <li key={s.id}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] text-[#0A0A0A]">{s.reviewerName}</p>
                <StarRating value={s.overallScore} size="sm" showValue={false} />
              </div>
              {s.notes && <p className="text-[12px] text-[#6B6B6B] mt-0.5 whitespace-pre-wrap">{s.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
