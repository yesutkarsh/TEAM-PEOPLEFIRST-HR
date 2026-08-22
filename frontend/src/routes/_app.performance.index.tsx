/** Personal performance dashboard — active cycle, goal progress, pending tasks, recent feedback. */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Breadcrumb, Button, EmptyState, Spinner, StatCard } from "@/lib/components/ui";
import { ReviewCycleBadge, GoalProgressRing, GoalStatusBadge } from "@/lib/components/performance";
import { performanceApi, objectiveDisplayProgress } from "@/lib/api/performance";
import { listEmployees } from "@/lib/api/employees";
import { authStore } from "@/lib/store/auth";
import type { Objective, Review, ReviewCycle } from "@/lib/types/performance";
import type { Employee } from "@/lib/types/employee";
import {
  Sparkles,
  ArrowUpRight,
  Target,
  Award,
  TrendingUp,
  Clock,
  Calendar,
  CheckCircle2,
  Star,
  Layers,
  BarChart3,
  ChevronRight,
  FileText,
  Users,
  ShieldCheck,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

export const Route = createFileRoute("/_app/performance/")({
  component: PerformanceDashboard,
  pendingComponent: () => (
    <div className="flex justify-center items-center py-24">
      <Spinner size={32} />
    </div>
  ),
  head: () => ({
    meta: [
      { title: "My Performance — HRMS" },
      { name: "description", content: "Your active review cycle, goal progress, pending tasks and recent feedback." },
      { property: "og:title", content: "My Performance — HRMS" },
      { property: "og:description", content: "Your active review cycle, goal progress, pending tasks and recent feedback." },
    ],
  }),
});

function PerformanceDashboard() {
  const user = authStore.useSelector((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Employee | null>(null);
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [goalFilter, setGoalFilter] = useState<"all" | "in_progress" | "on_track" | "completed">("all");

  useEffect(() => {
    let alive = true;
    void (async () => {
      const emps = await listEmployees();
      const meEmp = emps.data?.find((e) => e.workEmail === user?.email) ?? emps.data?.[0] ?? null;
      if (!meEmp) {
        if (alive) setLoading(false);
        return;
      }
      const [c, o, r] = await Promise.all([
        performanceApi.listCycles(),
        performanceApi.listObjectives({ ownerId: meEmp.id }),
        performanceApi.listReviews({ employeeId: meEmp.id }),
      ]);
      if (!alive) return;
      setMe(meEmp);
      setCycles(c.data ?? []);
      setObjectives(o.data ?? []);
      setReviews(r.data ?? []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [user?.email]);

  const activeCycle = useMemo(
    () => cycles.find((c) => c.status === "active" || c.status === "review_in_progress"),
    [cycles]
  );

  const avgProgress = useMemo(
    () =>
      objectives.length
        ? Math.round(objectives.reduce((s, o) => s + objectiveDisplayProgress(o), 0) / objectives.length)
        : 0,
    [objectives]
  );

  const pendingReviews = useMemo(
    () =>
      reviews.filter((r) =>
        ["not_started", "self_pending", "manager_pending", "peer_pending"].includes(r.status)
      ),
    [reviews]
  );

  const sharedReviews = useMemo(
    () => reviews.filter((r) => r.isSharedWithEmployee).slice(0, 3),
    [reviews]
  );

  const filteredObjectives = useMemo(() => {
    if (goalFilter === "all") return objectives;
    return objectives.filter((o) => o.status === goalFilter);
  }, [objectives, goalFilter]);

  // Chart Data for Goal Completion
  const chartData = useMemo(() => {
    return objectives.slice(0, 6).map((o) => ({
      name: o.title.length > 18 ? `${o.title.substring(0, 18)}...` : o.title,
      progress: objectiveDisplayProgress(o),
    }));
  }, [objectives]);

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
          { label: "Performance Hub" },
        ]}
      />

      {/* Minimal Header Card Surface */}
      <header className="rounded-3xl border border-[#E5E5E3] bg-white p-6 sm:p-7 shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[24px] sm:text-[28px] font-extrabold tracking-tight text-[#0A0A0A] font-sans">
            Performance Hub
          </h1>
          <p className="mt-1 text-[13px] sm:text-[14px] text-[#6B6B6B] font-medium">
            Track active review cycles, OKRs, goal progress, and continuous feedback.
          </p>
        </div>

        {/* Quick Action Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/performance/goals"
            className="group inline-flex items-center gap-1.5 rounded-xl bg-[#FAFAF9] hover:bg-[#F2F2F0] border border-[#E5E5E3] px-3.5 py-2 text-xs font-bold text-[#0A0A0A] transition-all active:scale-95 shadow-2xs"
          >
            <Target className="w-3.5 h-3.5 text-[#8E8E8E]" />
            My Goals
            <ArrowUpRight className="w-3.5 h-3.5 text-[#8E8E8E] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#0A0A0A]" />
          </Link>
          <Link
            to="/performance/reviews"
            className="group inline-flex items-center gap-1.5 rounded-xl bg-[#FAFAF9] hover:bg-[#F2F2F0] border border-[#E5E5E3] px-3.5 py-2 text-xs font-bold text-[#0A0A0A] transition-all active:scale-95 shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5 text-[#8E8E8E]" />
            Reviews
            <ArrowUpRight className="w-3.5 h-3.5 text-[#8E8E8E] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#0A0A0A]" />
          </Link>
          <Link
            to="/performance/calibration"
            className="group inline-flex items-center gap-1.5 rounded-xl bg-[#FAFAF9] hover:bg-[#F2F2F0] border border-[#E5E5E3] px-3.5 py-2 text-xs font-bold text-[#0A0A0A] transition-all active:scale-95 shadow-2xs"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#8E8E8E]" />
            Team Calibration
            <ArrowUpRight className="w-3.5 h-3.5 text-[#8E8E8E] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#0A0A0A]" />
          </Link>
        </div>
      </header>

      {/* KPI Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Objectives"
          value={String(objectives.length)}
          icon={<Target className="w-4 h-4 text-orange-500" />}
          trend="OKRs in progress"
          trendDir="up"
        />

        <StatCard
          label="Avg. Goal Progress"
          value={`${avgProgress}%`}
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
          trend={avgProgress >= 70 ? "Target on track" : "Pacing needed"}
          trendDir={avgProgress >= 70 ? "up" : "neutral"}
        >
          <div className="mt-2 w-full bg-[#E5E5E3] h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${avgProgress}%` }}
            />
          </div>
        </StatCard>

        <StatCard
          label="Pending Review Tasks"
          value={String(pendingReviews.length)}
          variant={pendingReviews.length > 0 ? "dark" : "default"}
          icon={<Clock className="w-4 h-4" />}
          trend={pendingReviews.length > 0 ? "Action required" : "All completed"}
          trendDir={pendingReviews.length > 0 ? "down" : "up"}
          actionHint
        >
          {pendingReviews.length > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-ping" />
              <span className="text-[11px] font-medium text-neutral-300">Requires self or manager review</span>
            </div>
          )}
        </StatCard>

        <StatCard
          label="Active Cycle"
          value={activeCycle ? "In Progress" : "None"}
          icon={<Award className="w-4 h-4 text-amber-500" />}
          trend={activeCycle ? activeCycle.name : "No active cycle"}
          trendDir="neutral"
        />
      </div>

      {/* Active Review Cycle Banner Card */}
      <div className="rounded-3xl border border-[#E5E5E3] bg-white p-6 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b border-[#F2F2F0]">
          <div>
            <h2 className="text-[20px] sm:text-[22px] font-extrabold text-[#0A0A0A] tracking-tight">
              {activeCycle ? activeCycle.name : "No Review Cycle Running Currently"}
            </h2>
            {activeCycle && (
              <p className="mt-1 text-[13px] text-[#6B6B6B] font-medium">
                Self-review deadline:{" "}
                <span className="font-extrabold text-[#0A0A0A] tabular-nums">
                  {new Date(activeCycle.selfReviewDeadline).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activeCycle && <ReviewCycleBadge status={activeCycle.status} />}
            {me && (
              <Link
                to="/performance/reviews"
                className="group inline-flex items-center gap-1 text-xs font-bold text-white bg-[#0A0A0A] hover:bg-neutral-800 px-4 py-2 rounded-xl transition-all shadow-2xs"
              >
                Go to reviews
                <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Review Phase Step Dots */}
        {activeCycle && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px] pt-1">
            <PhaseStep label="1. Self Review" active={["active", "review_in_progress"].includes(activeCycle.status)} />
            <PhaseStep label="2. Manager Review" active={["review_in_progress", "calibration"].includes(activeCycle.status)} />
            <PhaseStep label="3. Calibration" active={["calibration", "shared"].includes(activeCycle.status)} />
            <PhaseStep label="4. Results Shared" active={activeCycle.status === "completed"} />
          </div>
        )}
      </div>

      {/* Main Asymmetrical Bento Grid: OKR Progress & Analytics (3 Cols) vs Feedback (2 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 sm:gap-6">
        {/* Left Section (3 Columns): Interactive OKRs & Recharts Visualizer */}
        <div className="lg:col-span-3 rounded-3xl border border-[#E5E5E3] bg-white p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F2F2F0]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-orange-500" />
                <h3 className="text-[18px] sm:text-[20px] font-extrabold text-[#0A0A0A] tracking-tight">
                  My Goals & OKR Breakdown
                </h3>
              </div>
              <p className="text-[12px] text-[#6B6B6B]">Progress summary for the active evaluation period</p>
            </div>

            <Link
              to="/performance/goals"
              className="group inline-flex items-center gap-1 text-xs font-bold text-[#0A0A0A] hover:text-orange-600 transition-colors"
            >
              View all goals
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>

          {/* Recharts Progress Bar Chart */}
          {chartData.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#FAFAF9] border border-[#E5E5E3]">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#8E8E8E] mb-3">
                Completion Distribution (%)
              </p>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8E8E8E" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#8E8E8E" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111111", borderRadius: "12px", border: "none", color: "#FFF", fontSize: "12px" }}
                      formatter={(val: number) => [`${val}%`, "Progress"]}
                    />
                    <Bar dataKey="progress" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.progress >= 80 ? "#10B981" : entry.progress >= 40 ? "#F97316" : "#F59E0B"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Goals List */}
          {filteredObjectives.length === 0 ? (
            <EmptyState title="No goals found" subtitle="Create your first objective to start tracking progress." />
          ) : (
            <div className="divide-y divide-[#F2F2F0]">
              {filteredObjectives.slice(0, 5).map((o) => (
                <div key={o.id} className="py-3.5 flex items-center justify-between gap-4 group">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <GoalProgressRing value={objectiveDisplayProgress(o)} size={38} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-[#0A0A0A] truncate group-hover:text-orange-600 transition-colors">
                        {o.title}
                      </p>
                      <p className="text-[11px] text-[#8E8E8E] truncate">
                        {o.keyResults?.length ?? 0} Key Results · Target: {o.period || "Q3"}
                      </p>
                    </div>
                  </div>
                  <GoalStatusBadge status={o.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Section (2 Columns): Recent Feedback & Obsidian Rating Card */}
        <div className="lg:col-span-2 space-y-5">
          {/* Obsidian Dark Rating & Feedback Callout Tile */}
          <div className="rounded-3xl bg-[#111111] text-white p-6 sm:p-7 border border-[#222222] shadow-xl relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between pb-4 mb-4 border-b border-[#262626]">
              <div className="flex items-center gap-2">
                <h3 className="text-[16px] sm:text-[18px] font-bold text-white tracking-tight">
                  Recent Feedback & Score
                </h3>
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                Shared
              </span>
            </div>

            {sharedReviews.length === 0 ? (
              <div className="relative z-10 py-6 text-center">
                <p className="text-[13px] text-neutral-400 font-medium">No shared review feedback yet.</p>
                <p className="text-[11px] text-neutral-500 mt-1">Calibrated ratings appear here once HR releases results.</p>
              </div>
            ) : (
              <div className="relative z-10 space-y-3">
                {sharedReviews.map((r) => {
                  const rating = r.calibratedRating ?? r.managerReview?.overallRating ?? 0;
                  return (
                    <div key={r.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="font-semibold text-neutral-300">Overall Performance Score</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[18px] font-extrabold text-white tabular-nums">{rating}</span>
                          <span className="text-[12px] text-neutral-400">/ 5</span>
                        </div>
                      </div>
                      {r.managerReview?.summary && (
                        <p className="text-[12px] text-neutral-400 italic line-clamp-2">
                          "{r.managerReview.summary}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bento Action Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ShortcutTile
              title="My Goals & OKRs"
              subtitle="Update Key Results"
              to="/performance/goals"
              icon={<Target className="w-4 h-4 text-orange-500" />}
            />
            <ShortcutTile
              title="Review Tasks"
              subtitle="Pending Workflows"
              to="/performance/reviews"
              icon={<FileText className="w-4 h-4 text-emerald-500" />}
            />
            <ShortcutTile
              title="Calibration"
              subtitle="Team Ratings"
              to="/performance/calibration"
              icon={<BarChart3 className="w-4 h-4 text-amber-500" />}
            />
            <ShortcutTile
              title="Admin Tools"
              subtitle="Settings & Templates"
              to="/performance/admin"
              icon={<ShieldCheck className="w-4 h-4 text-cyan-500" />}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PhaseStep({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={`p-3 rounded-2xl border flex items-center gap-2 transition-all ${active ? "bg-[#0A0A0A] text-white border-[#0A0A0A]" : "bg-[#FAFAF9] text-[#8E8E8E] border-[#E5E5E3]"
        }`}
    >
      <span className={`w-2 h-2 rounded-full ${active ? "bg-orange-500 animate-pulse" : "bg-[#D1D5DB]"}`} />
      <span className="font-bold text-[11px] truncate">{label}</span>
    </div>
  );
}

function ShortcutTile({
  title,
  subtitle,
  to,
  icon,
}: {
  title: string;
  subtitle: string;
  to: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group p-4 rounded-2xl border border-[#E5E5E3] bg-white hover:bg-[#FAFAF9] hover:border-[#A3A3A3] transition-all duration-200 shadow-2xs flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 rounded-xl bg-[#FAFAF9] border border-[#E5E5E3] group-hover:scale-105 transition-transform">
          {icon}
        </div>
        <ArrowUpRight className="w-4 h-4 text-[#8E8E8E] group-hover:text-[#0A0A0A] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
      <div>
        <p className="text-[13px] font-extrabold text-[#0A0A0A] tracking-tight">{title}</p>
        <p className="text-[11px] text-[#8E8E8E] font-medium">{subtitle}</p>
      </div>
    </Link>
  );
}

