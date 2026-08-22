/** 9-box calibration — place reviews on the grid, adjust calibrated rating, notes. */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/lib/components/layout";
import { Card, EmptyState, Select, Spinner, Textarea, showToast } from "@/lib/components/ui";
import { PermissionGuard } from "@/lib/components/rbac";
import { NineBoxGrid, CalibrationRatingDistribution, RatingInput } from "@/lib/components/performance";
import { performanceApi } from "@/lib/api/performance";
import { listEmployees } from "@/lib/api/employees";
import type { Employee } from "@/lib/types/employee";
import type { NineBoxPosition, RatingScale, Review, ReviewCycle } from "@/lib/types/performance";

export const Route = createFileRoute("/_app/performance/calibration")({
  component: CalibrationPage,
  pendingComponent: () => <div className="flex justify-center py-20"><Spinner size={28} /></div>,
  head: () => ({
    meta: [
      { title: "Calibration — Performance — HRMS" },
      { name: "description", content: "Calibrate ratings across the organisation using the 9-box grid." },
      { property: "og:title", content: "Calibration — Performance — HRMS" },
      { property: "og:description", content: "Calibrate ratings across the organisation using the 9-box grid." },
    ],
  }),
});

function CalibrationPage() {
  return (
    <PermissionGuard
      permission="performance.manage"
      fallback={<div className="p-6 text-[14px] text-[#6B6B6B]">You don't have permission to calibrate reviews.</div>}
    >
      <CalibrationInner />
    </PermissionGuard>
  );
}

function CalibrationInner() {
  const [loading, setLoading] = useState(true);
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [cycleId, setCycleId] = useState<string>("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [scale, setScale] = useState<RatingScale | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [cRes, eRes] = await Promise.all([performanceApi.listCycles(), listEmployees()]);
      if (!alive) return;
      setCycles(cRes.data ?? []);
      setEmployees(eRes.data ?? []);
      setCycleId(cRes.data?.[0]?.id ?? "");
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const loadReviews = async (id: string) => {
    const [rRes, cRes, sRes] = await Promise.all([
      performanceApi.listReviews({ cycleId: id }),
      performanceApi.getCycle(id),
      performanceApi.getSettings(),
    ]);
    setReviews(rRes.data ?? []);
    setScale(sRes.data?.ratingScales.find((s) => s.id === cRes.data?.ratingScaleId) ?? sRes.data?.ratingScales[0] ?? null);
  };

  useEffect(() => { if (cycleId) void loadReviews(cycleId); }, [cycleId]);

  const entries = useMemo(
    () =>
      reviews
        .map((r) => ({ review: r, employee: employees.find((e) => e.id === r.employeeId) }))
        .filter((e): e is { review: Review; employee: Employee } => !!e.employee),
    [reviews, employees],
  );

  const selected = reviews.find((r) => r.id === selectedId) ?? null;

  useEffect(() => { setNote(selected?.calibrationNote ?? ""); }, [selectedId]);

  const place = async (reviewId: string, position: NineBoxPosition) => {
    const res = await performanceApi.calibrate(reviewId, { ninebox: position });
    if (res.error) return showToast(res.error.message, "error");
    showToast("Placement saved.", "success");
    await loadReviews(cycleId);
  };

  const setCalibratedRating = async (value: number) => {
    if (!selected) return;
    const res = await performanceApi.calibrate(selected.id, { calibratedRating: value });
    if (res.error) return showToast(res.error.message, "error");
    showToast("Calibrated rating updated.", "success");
    await loadReviews(cycleId);
  };

  const saveNote = async () => {
    if (!selected) return;
    const res = await performanceApi.calibrate(selected.id, { calibrationNote: note });
    if (res.error) return showToast(res.error.message, "error");
    showToast("Calibration note saved.", "success");
    await loadReviews(cycleId);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Calibration" description="Place employees on the 9-box grid and adjust calibrated ratings." />

      <Select
        className="max-w-72"
        label="Review cycle"
        value={cycleId}
        onChange={(e) => setCycleId(e.target.value)}
        options={cycles.map((c) => ({ value: c.id, label: c.name }))}
      />

      {entries.length === 0 ? (
        <EmptyState title="No reviews in this cycle" subtitle="Select a different cycle, or wait until reviews are in progress." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <NineBoxGrid entries={entries} selectedReviewId={selectedId} onSelect={setSelectedId} onPlace={place} />
          </Card>
          <div className="space-y-4">
            {scale && (
              <Card>
                <CalibrationRatingDistribution
                  scale={scale}
                  ratings={reviews.map((r) => r.calibratedRating ?? r.managerReview?.overallRating).filter((v): v is number => v !== undefined)}
                />
              </Card>
            )}
            {selected && scale && (
              <Card className="space-y-3">
                <p className="text-[13px] font-medium text-[#0A0A0A]">
                  {employees.find((e) => e.id === selected.employeeId)?.firstName} {employees.find((e) => e.id === selected.employeeId)?.lastName}
                </p>
                <RatingInput scale={scale} label="Manager rating" value={selected.managerReview?.overallRating} disabled />
                <RatingInput scale={scale} label="Calibrated rating" value={selected.calibratedRating} onChange={setCalibratedRating} />
                <Textarea label="Calibration note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} onBlur={saveNote} />
              </Card>
            )}
            {!selected && <EmptyState title="Select an employee" subtitle="Pick an avatar on the grid to adjust their calibrated rating." />}
          </div>
        </div>
      )}
    </div>
  );
}
