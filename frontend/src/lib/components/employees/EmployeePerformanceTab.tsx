/** Goals + review history shown inside the employee profile. */
import { useEffect, useState } from "react";
import { Award, Target, Sparkles } from "lucide-react";
import { Card, EmptyState, Spinner } from "@/lib/components/ui";
import { GoalProgressRing } from "@/lib/components/performance/GoalProgressRing";
import { ReviewStatusBadge } from "@/lib/components/performance/ReviewStatusBadge";
import { performanceApi, objectiveDisplayProgress } from "@/lib/api/performance";
import type { Objective, Review, ReviewCycle } from "@/lib/types/performance";
import type { Employee } from "@/lib/types/employee";

export function EmployeePerformanceTab({ employee }: { employee: Employee }) {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void Promise.all([
      performanceApi.listObjectives({ ownerId: employee.id }),
      performanceApi.listReviews({ employeeId: employee.id }),
      performanceApi.listCycles(),
    ]).then(([o, r, c]) => {
      if (!alive) return;
      setObjectives(o.data ?? []);
      setReviews(r.data ?? []);
      setCycles(c.data ?? []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [employee.id]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E5E5E3] bg-white p-12 flex justify-center items-center">
        <Spinner />
      </div>
    );
  }

  const cycleName = (id: string) => cycles.find((c) => c.id === id)?.name ?? "Review cycle";

  return (
    <div className="space-y-5">
      {/* Goals & Objectives Container */}
      <div className="rounded-2xl border border-[#E5E5E3] bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-600" />
            <h3 className="text-[14px] font-bold text-[#0A0A0A] tracking-tight">Active Objectives & Goals</h3>
          </div>
          <span className="text-[11px] font-semibold text-[#8E8E8E] uppercase tracking-wider">
            {objectives.length} goal{objectives.length === 1 ? "" : "s"}
          </span>
        </div>

        {objectives.length === 0 ? (
          <EmptyState title="No goals set" subtitle="This employee has no objectives for the current period." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {objectives.map((o) => {
              const pct = objectiveDisplayProgress(o);
              return (
                <div
                  key={o.id}
                  className="p-4 rounded-xl border border-[#E5E5E3] bg-[#FAFAF9] hover:bg-white transition-colors flex items-start gap-3.5"
                >
                  <GoalProgressRing value={pct} size={44} />
                  <div className="min-w-0 space-y-1">
                    <p className="text-[14px] font-bold text-[#0A0A0A] truncate">{o.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#8E8E8E]">
                      <span className="font-semibold text-neutral-600">{o.period} {o.year}</span>
                      <span>•</span>
                      <span>{o.keyResults.length} Key Result{o.keyResults.length === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review History List Widget */}
      <div className="rounded-2xl border border-[#E5E5E3] bg-white shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F2F2F0] flex items-center justify-between bg-[#FAFAF9]">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-orange-600" />
            <h3 className="text-[14px] font-bold text-[#0A0A0A] tracking-tight">Performance Reviews</h3>
          </div>
          <span className="text-[11px] font-semibold text-[#8E8E8E] uppercase tracking-wider">
            {reviews.length} cycle{reviews.length === 1 ? "" : "s"}
          </span>
        </div>

        {reviews.length === 0 ? (
          <div className="p-8">
            <EmptyState title="No reviews" subtitle="Reviews appear once a cycle includes this employee." />
          </div>
        ) : (
          <ul className="divide-y divide-[#F2F2F0]">
            {reviews.map((r) => {
              const rating = r.calibratedRating ?? r.managerReview?.overallRating;
              return (
                <li key={r.id} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-[#FAFAF9] transition-colors">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-[14px] font-bold text-[#0A0A0A] truncate">{cycleName(r.cycleId)}</p>
                    <p className="text-[12px] text-[#8E8E8E] font-medium flex items-center gap-1.5">
                      {rating ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          Rating: {rating}
                        </span>
                      ) : (
                        <span className="text-neutral-400">Not rated yet</span>
                      )}
                    </p>
                  </div>
                  <ReviewStatusBadge status={r.status} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

