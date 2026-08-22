/** My objectives/KRAs — create/edit objectives + key results, filter by cycle/status. */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Breadcrumb,
  Button,
  EmptyState,
  Input,
  Select,
  SlideOver,
  Spinner,
  StatCard,
  showToast,
  Textarea,
} from "@/lib/components/ui";
import { ObjectiveCard } from "@/lib/components/performance";
import { performanceApi, objectiveDisplayProgress } from "@/lib/api/performance";
import { listEmployees } from "@/lib/api/employees";
import { authStore } from "@/lib/store/auth";
import {
  GOAL_PERIOD_LABELS,
  GOAL_STATUS_LABELS,
  type GoalPeriod,
  type GoalStatus,
  type Objective,
} from "@/lib/types/performance";
import type { Employee } from "@/lib/types/employee";
import {
  Target,
  Plus,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Filter,
} from "lucide-react";

export const Route = createFileRoute("/_app/performance/goals")({
  component: MyGoalsPage,
  pendingComponent: () => (
    <div className="flex justify-center items-center py-24">
      <Spinner size={32} />
    </div>
  ),
  head: () => ({
    meta: [
      { title: "My Goals — Performance — HRMS" },
      { name: "description", content: "Track and update your objectives, key results and KRAs." },
      { property: "og:title", content: "My Goals — Performance — HRMS" },
      { property: "og:description", content: "Track and update your objectives, key results and KRAs." },
    ],
  }),
});

interface KrDraft {
  title: string;
  targetValue: string;
  currentValue: string;
  unit: string;
}

function MyGoalsPage() {
  const user = authStore.useSelector((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Employee | null>(null);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [period, setPeriod] = useState<GoalPeriod>("q1");
  const [krs, setKrs] = useState<KrDraft[]>([{ title: "", targetValue: "", currentValue: "0", unit: "%" }]);
  const [saving, setSaving] = useState(false);

  const reload = async (ownerId: string) => {
    const res = await performanceApi.listObjectives({ ownerId });
    setObjectives(res.data ?? []);
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
      await reload(meEmp.id);
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [user?.email]);

  const filtered = useMemo(
    () =>
      objectives.filter(
        (o) =>
          (periodFilter === "all" || o.period === periodFilter) &&
          (statusFilter === "all" || o.status === statusFilter)
      ),
    [objectives, periodFilter, statusFilter]
  );

  const avgProgress = useMemo(
    () =>
      objectives.length
        ? Math.round(objectives.reduce((s, o) => s + objectiveDisplayProgress(o), 0) / objectives.length)
        : 0,
    [objectives]
  );

  const onTrackCount = useMemo(
    () => objectives.filter((o) => o.status === "on_track" || o.status === "completed").length,
    [objectives]
  );

  const atRiskCount = useMemo(
    () => objectives.filter((o) => o.status === "behind" || o.status === "at_risk").length,
    [objectives]
  );

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPeriod("q1");
    setKrs([{ title: "", targetValue: "", currentValue: "0", unit: "%" }]);
  };

  const saveObjective = async () => {
    if (!me || !title.trim()) return;
    setSaving(true);
    try {
      const keyResults = krs
        .filter((k) => k.title.trim())
        .map((k) => ({
          id: `kr_${Math.random().toString(36).slice(2, 9)}`,
          objectiveId: "",
          title: k.title,
          targetValue: Number(k.targetValue) || 0,
          currentValue: Number(k.currentValue) || 0,
          unit: k.unit,
          progress: 0,
          status: "active" as GoalStatus,
          lastUpdatedAt: new Date().toISOString(),
        }));
      const res = await performanceApi.saveObjective({
        title: title.trim(),
        description: description.trim() || undefined,
        ownerId: me.id,
        level: "individual",
        departmentId: me.departmentId,
        period,
        year: new Date().getFullYear(),
        createdBy: me.id,
        keyResults,
      });
      if (res.error) return showToast(res.error.message, "error");
      showToast("Objective created successfully.", "success");
      setOpen(false);
      resetForm();
      await reload(me.id);
    } finally {
      setSaving(false);
    }
  };

  const updateKr = async (objectiveId: string, krId: string, value: number) => {
    const res = await performanceApi.updateKeyResult(objectiveId, krId, value);
    if (res.error) return showToast(res.error.message, "error");
    showToast("Progress updated.", "success");
    if (me) await reload(me.id);
  };

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
          { label: "My Goals" },
        ]}
      />

      {/* Minimal Header Card Surface */}
      <header className="rounded-3xl border border-[#E5E5E3] bg-white p-6 sm:p-7 shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[24px] sm:text-[28px] font-extrabold tracking-tight text-[#0A0A0A] font-sans">
            My Goals & OKRs
          </h1>
          <p className="mt-1 text-[13px] sm:text-[14px] text-[#6B6B6B] font-medium">
            Define objectives, track key results, and monitor progress across evaluation periods.
          </p>
        </div>

        <div>
          <Button
            onClick={() => setOpen(true)}
            className="gap-2 bg-[#0A0A0A] flex hover:bg-neutral-800 text-white font-bold px-5 rounded-xl shadow-2xs"
          >
            New Objective
          </Button>
        </div>
      </header>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Objectives"
          value={String(objectives.length)}
          icon={<Target className="w-4 h-4 text-orange-500" />}
          trend="Active OKRs"
          trendDir="up"
        />

        <StatCard
          label="Avg. Completion Rate"
          value={`${avgProgress}%`}
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
          trend={avgProgress >= 70 ? "On track" : "Needs attention"}
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
          label="On Track / Achieved"
          value={String(onTrackCount)}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          trend="Meeting targets"
          trendDir="up"
        />

        <StatCard
          label="Behind / At Risk"
          value={String(atRiskCount)}
          variant={atRiskCount > 0 ? "dark" : "default"}
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
          trend={atRiskCount > 0 ? "Requires focus" : "No risks"}
          trendDir={atRiskCount > 0 ? "down" : "up"}
          actionHint
        >
          {atRiskCount > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-ping" />
              <span className="text-[11px] font-medium text-neutral-300">Action needed on key results</span>
            </div>
          )}
        </StatCard>
      </div>

      {/* Filter Controls Bar */}
      <div className="p-4 rounded-2xl bg-[#FAFAF9] border border-[#E5E5E3] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#8E8E8E]" />
          <span className="text-[12px] font-extrabold uppercase tracking-wider text-[#8E8E8E]">
            Filter Goals:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select
            className="w-44 text-xs"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            options={[
              { value: "all", label: "All Periods" },
              ...Object.entries(GOAL_PERIOD_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
          <Select
            className="w-44 text-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "all", label: "All Statuses" },
              ...Object.entries(GOAL_STATUS_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
        </div>
      </div>

      {/* Objectives Cards Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No goals found"
          subtitle="Try adjusting your filters, or click 'New Objective' above to create one."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((o) => (
            <ObjectiveCard
              key={o.id}
              objective={o}
              editable
              onUpdateKr={(krId, v) => updateKr(o.id, krId, v)}
            />
          ))}
        </div>
      )}

      {/* SlideOver Drawer for New Objective */}
      <SlideOver
        open={open}
        onClose={() => {
          setOpen(false);
          resetForm();
        }}
        title="Create New Objective"
        description="Define your goal title, period, and measurable key results."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={saving}
              disabled={!title.trim()}
              onClick={() => void saveObjective()}
              className="bg-[#0A0A0A] hover:bg-neutral-800 text-white font-bold"
            >
              Create objective
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Objective Title"
            placeholder="e.g. Increase product engagement rate"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            label="Description (optional)"
            placeholder="Provide context or alignment details..."
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Select
            label="Evaluation Period"
            value={period}
            onChange={(e) => setPeriod(e.target.value as GoalPeriod)}
            options={Object.entries(GOAL_PERIOD_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <div className="space-y-3 pt-2 border-t border-[#E5E5E3]">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-extrabold uppercase tracking-wider text-[#8E8E8E]">
                Key Results
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setKrs((prev) => [...prev, { title: "", targetValue: "", currentValue: "0", unit: "%" }])
                }
                className="text-xs"
              >
                + Add KR
              </Button>
            </div>

            {krs.map((k, i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-[#FAFAF9] border border-[#E5E5E3] space-y-2">
                <Input
                  placeholder="Key result title (e.g. Reach 50,000 MAU)"
                  value={k.title}
                  onChange={(e) =>
                    setKrs((prev) =>
                      prev.map((x, xi) => (xi === i ? { ...x, title: e.target.value } : x))
                    )
                  }
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Target value"
                    value={k.targetValue}
                    onChange={(e) =>
                      setKrs((prev) =>
                        prev.map((x, xi) => (xi === i ? { ...x, targetValue: e.target.value } : x))
                      )
                    }
                  />
                  <Input
                    placeholder="Unit (%, items, $)"
                    value={k.unit}
                    onChange={(e) =>
                      setKrs((prev) =>
                        prev.map((x, xi) => (xi === i ? { ...x, unit: e.target.value } : x))
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </SlideOver>
    </div>
  );
}

