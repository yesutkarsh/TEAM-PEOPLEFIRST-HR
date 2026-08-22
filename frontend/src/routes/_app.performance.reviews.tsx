/** My reviews — self-assessment, peer nomination, view shared results. */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Breadcrumb,
  Button,
  EmptyState,
  Spinner,
  StatCard,
  showToast,
} from "@/lib/components/ui";
import {
  ReviewFormRenderer,
  ReviewSummaryCard,
  PeerNominationPanel,
  ReviewCycleBadge,
} from "@/lib/components/performance";
import { performanceApi } from "@/lib/api/performance";
import { listEmployees } from "@/lib/api/employees";
import { authStore } from "@/lib/store/auth";
import type { Employee } from "@/lib/types/employee";
import type {
  Objective,
  RatingScale,
  Review,
  ReviewCycle,
  ReviewFormTemplate,
  ReviewResponse,
} from "@/lib/types/performance";
import {
  FileText,
  CheckCircle2,
  Clock,
  Users,
  Award,
  Sparkles,
  ArrowUpRight,
  Save,
  Send,
} from "lucide-react";

export const Route = createFileRoute("/_app/performance/reviews")({
  component: MyReviewsPage,
  pendingComponent: () => (
    <div className="flex justify-center items-center py-24">
      <Spinner size={32} />
    </div>
  ),
  head: () => ({
    meta: [
      { title: "My Reviews — Performance — HRMS" },
      { name: "description", content: "Complete your self-assessment, nominate peers and view shared results." },
      { property: "og:title", content: "My Reviews — Performance — HRMS" },
      { property: "og:description", content: "Complete your self-assessment, nominate peers and view shared results." },
    ],
  }),
});

function MyReviewsPage() {
  const user = authStore.useSelector((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [form, setForm] = useState<ReviewFormTemplate | null>(null);
  const [scale, setScale] = useState<RatingScale | null>(null);
  const [goals, setGoals] = useState<Objective[]>([]);
  const [responses, setResponses] = useState<ReviewResponse[]>([]);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const activeReview = reviews.find((r) => r.status !== "completed") ?? reviews[0];
  const activeCycle = cycles.find((c) => c.id === activeReview?.cycleId);
  const settings = performanceApi.getSettings;

  const load = async (meEmp: Employee) => {
    const [empRes, rRes, cRes] = await Promise.all([
      listEmployees(),
      performanceApi.listReviews({ employeeId: meEmp.id }),
      performanceApi.listCycles(),
    ]);
    setEmployees(empRes.data ?? []);
    setReviews(rRes.data ?? []);
    setCycles(cRes.data ?? []);
    const first = (rRes.data ?? []).find((r) => r.status !== "completed") ?? (rRes.data ?? [])[0];
    if (first) {
      const cycle = (cRes.data ?? []).find((c) => c.id === first.cycleId);
      const [formRes, settingsRes, goalsRes] = await Promise.all([
        cycle ? performanceApi.getForm(cycle.reviewFormId) : Promise.resolve({ data: undefined }),
        settings(),
        performanceApi.listObjectives({ ownerId: meEmp.id, period: undefined }),
      ]);
      setForm(formRes.data ?? null);
      setScale(
        settingsRes.data?.ratingScales.find((s) => s.id === cycle?.ratingScaleId) ??
        settingsRes.data?.ratingScales[0] ??
        null
      );
      setGoals(goalsRes.data ?? []);
      setResponses(first.selfAssessment?.responses ?? []);
      setComment(first.selfAssessment?.overallComment ?? "");
      setRating(first.selfAssessment?.overallRating);
    }
  };

  useEffect(() => {
    let alive = true;
    void (async () => {
      const emps = await listEmployees();
      const meEmp = emps.data?.find((e) => e.workEmail === user?.email) ?? emps.data?.[0] ?? null;
      if (!meEmp) {
        if (alive) setLoading(false);
        return;
      }
      setMe(meEmp);
      await load(meEmp);
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [user?.email]);

  const settingsMinPeers = 3;

  const submitSelf = async (isDraft: boolean) => {
    if (!activeReview) return;
    setSaving(true);
    try {
      const res = await performanceApi.saveSubmission(activeReview.id, "self", {
        submitterId: me!.id,
        responses,
        overallRating: rating ?? 0,
        overallComment: comment,
        isDraft,
      });
      if (res.error) return showToast(res.error.message, "error");
      showToast(isDraft ? "Draft saved successfully." : "Self-assessment submitted.", "success");
      if (me) await load(me);
    } finally {
      setSaving(false);
    }
  };

  const otherReviews = useMemo(
    () => reviews.filter((r) => r.id !== activeReview?.id),
    [reviews, activeReview]
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-7 pb-12">
      <Breadcrumb
        items={[
          { label: "Overview", to: "/dashboard" },
          { label: "Performance", to: "/performance" },
          { label: "My Reviews" },
        ]}
      />

      {/* Minimal Header Card Surface */}
      <header className="rounded-3xl border border-[#E5E5E3] bg-white p-6 sm:p-7 shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">


          <h1 className="text-[24px] sm:text-[28px] font-extrabold tracking-tight text-[#0A0A0A] font-sans">
            My Reviews & Assessments
          </h1>
          <p className="mt-1 text-[13px] sm:text-[14px] text-[#6B6B6B] font-medium">
            Complete self-evaluations, nominate peer reviewers, and inspect calibrated ratings.
          </p>
        </div>

        {activeCycle && (
          <div className="flex items-center gap-3 w-100">
            <ReviewCycleBadge status={activeCycle.status} />
          </div>
        )}
      </header>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Self-Assessment Status"
          value={
            activeReview
              ? activeReview.status === "completed"
                ? "Completed"
                : activeReview.status === "self_pending" || activeReview.status === "not_started"
                  ? "Pending"
                  : "Under Review"
              : "No Active Review"
          }
          variant={activeReview && activeReview.status !== "completed" ? "dark" : "default"}
          icon={<Clock className="w-4 h-4" />}
          trend={activeReview ? activeReview.status : "Idle"}
          trendDir={activeReview && activeReview.status !== "completed" ? "down" : "up"}
          actionHint
        >
          {activeReview && activeReview.status !== "completed" && (
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-ping" />
              <span className="text-[11px] font-medium text-neutral-300">Self-assessment required</span>
            </div>
          )}
        </StatCard>

        <StatCard
          label="Peer Nominations"
          value={activeReview?.peerIds ? `${activeReview.peerIds.length} / ${settingsMinPeers}` : `0 / ${settingsMinPeers}`}
          icon={<Users className="w-4 h-4 text-emerald-600" />}
          trend="Minimum 3 required"
          trendDir="neutral"
        />

        <StatCard
          label="Active Evaluation Cycle"
          value={activeCycle ? activeCycle.name : "None"}
          icon={<Award className="w-4 h-4 text-orange-500" />}
          trend={activeCycle ? `Deadline: ${new Date(activeCycle.selfReviewDeadline).toLocaleDateString()}` : "No cycle running"}
          trendDir="neutral"
        />
      </div>

      {!activeReview ? (
        <EmptyState
          title="No active reviews found"
          subtitle="You will see your self-assessment form here once HR initiates a review cycle."
        />
      ) : (
        <div className="space-y-6">
          {/* Peer Nomination Panel Container */}
          {activeCycle?.includesPeerReview && (
            <div className="rounded-3xl border border-[#E5E5E3] bg-white p-6 sm:p-7 shadow-xs">
              <PeerNominationPanel
                review={activeReview}
                employees={employees}
                minPeers={settingsMinPeers}
                onSave={async (ids) => {
                  const res = await performanceApi.nominatePeers(activeReview.id, ids);
                  if (res.error) return showToast(res.error.message, "error");
                  showToast("Peer nominations saved successfully.", "success");
                  if (me) await load(me);
                }}
              />
            </div>
          )}

          {/* Form Renderer Container */}
          {form && scale ? (
            <div className="rounded-3xl border border-[#E5E5E3] bg-white p-6 sm:p-7 shadow-xs space-y-6">
              <div className="pb-4 mb-4 border-b border-[#F2F2F0] flex items-center justify-between">
                <div>
                  <h2 className="text-[18px] font-extrabold text-[#0A0A0A] tracking-tight">
                    Self-Assessment Questionnaire
                  </h2>
                  <p className="text-[12px] text-[#6B6B6B]">
                    Evaluate your performance and goal achievements for this cycle.
                  </p>
                </div>
              </div>

              <ReviewFormRenderer
                sections={form.sections}
                respondent="self"
                scale={scale}
                competencies={[]}
                goals={goals}
                responses={responses}
                onChange={setResponses}
                readOnly={activeReview.status !== "not_started" && activeReview.status !== "self_pending"}
                showConfidential={false}
              />

              {(activeReview.status === "not_started" || activeReview.status === "self_pending") && (
                <div className="pt-4 border-t border-[#F2F2F0] flex items-center justify-end gap-3">
                  <Button
                    variant="secondary"
                    loading={saving}
                    onClick={() => void submitSelf(true)}
                    className="gap-2"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save draft
                  </Button>
                  <Button
                    variant="primary"
                    loading={saving}
                    onClick={() => void submitSelf(false)}
                    className="gap-2 bg-[#0A0A0A] hover:bg-neutral-800 text-white font-bold px-6"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Submit self-assessment
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <EmptyState title="Review form unavailable" subtitle="The review form for this cycle could not be loaded." />
          )}
        </div>
      )}

      {/* Past Cycles History */}
      {otherReviews.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-[#E5E5E3]">
          <h2 className="text-[18px] font-extrabold text-[#0A0A0A] tracking-tight">
            Past Review Cycles
          </h2>
          <div className="space-y-3">
            {otherReviews.map((r) => (
              <ReviewSummaryCard key={r.id} review={r} cycle={cycles.find((c) => c.id === r.cycleId)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

