/** Direct-report detail — goals, review status, write/submit manager review, PIP actions. */
import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/lib/components/layout";
import { Button, Card, DatePicker, EmptyState, Input, SlideOver, Spinner, Textarea, showToast } from "@/lib/components/ui";
import { EmployeeAvatar } from "@/lib/components/employees";
import {
  ObjectiveCard, ReviewFormRenderer, ReviewStatusBadge, PIPCard,
} from "@/lib/components/performance";
import { performanceApi } from "@/lib/api/performance";
import { listEmployees } from "@/lib/api/employees";
import { authStore } from "@/lib/store/auth";
import type { Employee } from "@/lib/types/employee";
import type {
  Objective, PIP, RatingScale, Review, ReviewCycle, ReviewFormTemplate, ReviewResponse,
} from "@/lib/types/performance";

export const Route = createFileRoute("/_app/performance/team/$employeeId")({
  component: TeamMemberDetailPage,
  pendingComponent: () => <div className="flex justify-center py-20"><Spinner size={28} /></div>,
  head: () => ({
    meta: [
      { title: "Direct Report — Performance — HRMS" },
      { name: "description", content: "Review goals, write manager reviews and manage improvement plans for a direct report." },
      { property: "og:title", content: "Direct Report — Performance — HRMS" },
      { property: "og:description", content: "Review goals, write manager reviews and manage improvement plans for a direct report." },
    ],
  }),
});

function TeamMemberDetailPage() {
  const { employeeId } = Route.useParams();
  const user = authStore.useSelector((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Employee | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [cycle, setCycle] = useState<ReviewCycle | null>(null);
  const [form, setForm] = useState<ReviewFormTemplate | null>(null);
  const [scale, setScale] = useState<RatingScale | null>(null);
  const [responses, setResponses] = useState<ReviewResponse[]>([]);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [pips, setPips] = useState<PIP[]>([]);
  const [pipOpen, setPipOpen] = useState(false);
  const [pipReason, setPipReason] = useState("");
  const [pipEnd, setPipEnd] = useState("");
  const [pipGoals, setPipGoals] = useState([{ description: "", metric: "", dueDate: "" }]);
  const [pipSaving, setPipSaving] = useState(false);

  const load = async (meEmp: Employee, emp: Employee) => {
    const [oRes, rRes, pRes] = await Promise.all([
      performanceApi.listObjectives({ ownerId: emp.id }),
      performanceApi.listReviews({ employeeId: emp.id, managerId: meEmp.id }),
      performanceApi.listPips({ employeeId: emp.id }),
    ]);
    setObjectives(oRes.data ?? []);
    setPips(pRes.data ?? []);
    const r = rRes.data?.[0] ?? null;
    setReview(r);
    if (r) {
      const [cRes, sRes] = await Promise.all([performanceApi.getCycle(r.cycleId), performanceApi.getSettings()]);
      const c = cRes.data ?? null;
      setCycle(c);
      setScale(sRes.data?.ratingScales.find((s) => s.id === c?.ratingScaleId) ?? sRes.data?.ratingScales[0] ?? null);
      if (c) {
        const fRes = await performanceApi.getForm(c.reviewFormId);
        setForm(fRes.data ?? null);
      }
      setResponses(r.managerReview?.responses ?? []);
      setComment(r.managerReview?.overallComment ?? "");
      setRating(r.managerReview?.overallRating);
    } else {
      setCycle(null);
      setForm(null);
    }
  };

  useEffect(() => {
    let alive = true;
    void (async () => {
      const emps = await listEmployees();
      const meEmp = emps.data?.find((e) => e.workEmail === user?.email) ?? emps.data?.[0] ?? null;
      const emp = emps.data?.find((e) => e.id === employeeId) ?? null;
      if (!meEmp || !emp) { if (alive) setLoading(false); return; }
      setMe(meEmp);
      setEmployee(emp);
      await load(meEmp, emp);
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [user?.email, employeeId]);

  const submitManagerReview = async (isDraft: boolean) => {
    if (!review || !me) return;
    setSaving(true);
    try {
      const res = await performanceApi.saveSubmission(review.id, "manager", {
        submitterId: me.id, responses, overallRating: rating ?? 0, overallComment: comment, isDraft,
      });
      if (res.error) return showToast(res.error.message, "error");
      showToast(isDraft ? "Draft saved." : "Manager review submitted.", "success");
      if (employee) await load(me, employee);
    } finally {
      setSaving(false);
    }
  };

  const concludePip = async (pipId: string, outcome: NonNullable<PIP["outcome"]>) => {
    if (!me || !employee) return;
    const res = await performanceApi.concludePip(pipId, outcome, `Concluded as ${outcome}.`);
    if (res.error) return showToast(res.error.message, "error");
    showToast("PIP concluded.", "success");
    await load(me, employee);
  };

  const createPip = async () => {
    if (!me || !employee || !pipReason.trim() || !pipEnd) { showToast("Reason and end date are required.", "error"); return; }
    const goals = pipGoals.filter((g) => g.description.trim());
    if (goals.length === 0) { showToast("Add at least one improvement goal.", "error"); return; }
    setPipSaving(true);
    try {
      const res = await performanceApi.createPip({
        employeeId: employee.id, managerId: me.id, createdBy: me.id,
        startDate: new Date().toISOString(), endDate: new Date(pipEnd).toISOString(),
        reason: pipReason.trim(), goals,
      });
      if (res.error) return showToast(res.error.message, "error");
      showToast("PIP created.", "success");
      setPipOpen(false);
      setPipReason(""); setPipEnd(""); setPipGoals([{ description: "", metric: "", dueDate: "" }]);
      await load(me, employee);
    } finally {
      setPipSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
  if (!employee) return <EmptyState title="Employee not found" />;

  const canWrite = review && (review.status === "self_complete" || review.status === "manager_pending" || review.status === "not_started" || review.status === "self_pending");

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${employee.firstName} ${employee.lastName}`}
        description="Direct report's goals, review status and improvement plans."
        actions={<Link to="/performance/team" className="text-[13px] font-medium hover:underline" style={{ color: "var(--tenant-primary)" }}>← Back to my team</Link>}
      />

      <Card className="flex items-center gap-3">
        <EmployeeAvatar employee={employee} size="md" />
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-[#0A0A0A]">{employee.firstName} {employee.lastName}</p>
          <p className="text-[12px] text-[#6B6B6B]">{employee.employeeCode}</p>
        </div>
        {review && <div className="ml-auto"><ReviewStatusBadge status={review.status} /></div>}
      </Card>

      <div className="space-y-3">
        <h2 className="text-[15px] font-semibold text-[#0A0A0A]">Goals</h2>
        {objectives.length === 0 ? (
          <EmptyState title="No goals set" subtitle="This employee hasn't created any objectives yet." />
        ) : (
          objectives.map((o) => <ObjectiveCard key={o.id} objective={o} />)
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-[15px] font-semibold text-[#0A0A0A]">Manager review</h2>
        {!review ? (
          <EmptyState title="No review cycle" subtitle="There's no active review cycle for this employee yet." />
        ) : !form || !scale ? (
          <EmptyState title="Review form unavailable" subtitle="The review form for this cycle could not be loaded." />
        ) : (
          <div className="space-y-4">
            <ReviewFormRenderer
              sections={form.sections}
              respondent="manager"
              scale={scale}
              competencies={[]}
              goals={objectives}
              responses={responses}
              onChange={setResponses}
              readOnly={!canWrite}
              showConfidential
            />
            <Textarea label="Overall comment" rows={3} disabled={!canWrite} value={comment} onChange={(e) => setComment(e.target.value)} />
            {canWrite && (
              <div className="flex justify-end gap-2">
                <Button variant="secondary" loading={saving} onClick={() => void submitManagerReview(true)}>Save draft</Button>
                <Button variant="primary" loading={saving} onClick={() => void submitManagerReview(false)}>Submit review</Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[#0A0A0A]">Performance Improvement Plans</h2>
          <Button size="sm" variant="secondary" onClick={() => setPipOpen(true)}>+ Start PIP</Button>
        </div>
        {pips.length === 0 ? (
          <EmptyState title="No PIPs" subtitle="This employee is not currently on a performance improvement plan." />
        ) : (
          pips.map((p) => (
            <PIPCard
              key={p.id}
              pip={p}
              editable={p.status === "active"}
              onSetGoalStatus={async (goalId, status) => {
                await performanceApi.setPipGoalStatus(p.id, goalId, status);
                if (me && employee) await load(me, employee);
              }}
              onAddCheckIn={async (notes) => {
                if (!me) return;
                await performanceApi.addPipCheckIn(p.id, notes, me.id);
                if (employee) await load(me, employee);
              }}
            >
              {p.status === "active" && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E5E5E3]">
                  <Button size="sm" variant="secondary" onClick={() => void concludePip(p.id, "improved")}>Conclude — Improved</Button>
                  <Button size="sm" variant="ghost" onClick={() => void concludePip(p.id, "extended")}>Conclude — Extend</Button>
                  <Button size="sm" variant="ghost" onClick={() => void concludePip(p.id, "separated")}>Conclude — Separate</Button>
                </div>
              )}
            </PIPCard>
          ))
        )}
      </div>

      <SlideOver
        open={pipOpen}
        onClose={() => setPipOpen(false)}
        title="Start a Performance Improvement Plan"
        description="Define the reason, timeline and improvement goals."
        footer={<><Button variant="secondary" onClick={() => setPipOpen(false)}>Cancel</Button><Button variant="primary" loading={pipSaving} onClick={() => void createPip()}>Create PIP</Button></>}
      >
        <div className="space-y-4">
          <Textarea label="Reason" rows={3} value={pipReason} onChange={(e) => setPipReason(e.target.value)} />
          <DatePicker label="End date" value={pipEnd} onChange={setPipEnd} />
          <div className="space-y-3">
            <p className="text-[13px] font-medium text-[#0A0A0A]">Improvement goals</p>
            {pipGoals.map((g, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <Input
                  className="col-span-2"
                  placeholder="Goal description"
                  value={g.description}
                  onChange={(e) => setPipGoals((prev) => prev.map((x, xi) => (xi === i ? { ...x, description: e.target.value } : x)))}
                />
                <Input
                  placeholder="Success metric"
                  value={g.metric}
                  onChange={(e) => setPipGoals((prev) => prev.map((x, xi) => (xi === i ? { ...x, metric: e.target.value } : x)))}
                />
                <DatePicker
                  value={g.dueDate}
                  onChange={(v) => setPipGoals((prev) => prev.map((x, xi) => (xi === i ? { ...x, dueDate: v } : x)))}
                />
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setPipGoals((prev) => [...prev, { description: "", metric: "", dueDate: "" }])}>+ Add goal</Button>
          </div>
        </div>
      </SlideOver>
    </div>
  );
}
