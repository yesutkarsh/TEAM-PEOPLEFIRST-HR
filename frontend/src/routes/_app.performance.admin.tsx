/** HR admin — review cycles, launch/close, reminders, sharing, manager reassignment. */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/lib/components/layout";
import { Button, EmptyState, Spinner, showToast } from "@/lib/components/ui";
import { ReviewCycleCard } from "@/lib/components/performance";
import { PermissionGuard } from "@/lib/components/rbac";
import { performanceApi } from "@/lib/api/performance";
import type { ReviewCycle } from "@/lib/types/performance";

export const Route = createFileRoute("/_app/performance/admin")({
  component: PerformanceAdminPage,
  pendingComponent: () => <div className="flex justify-center py-20"><Spinner size={28} /></div>,
  head: () => ({
    meta: [
      { title: "Cycles Admin — Performance — HRMS" },
      { name: "description", content: "Launch, close and monitor review cycles across the organisation." },
      { property: "og:title", content: "Cycles Admin — Performance — HRMS" },
      { property: "og:description", content: "Launch, close and monitor review cycles across the organisation." },
    ],
  }),
});

type CycleStats = NonNullable<Awaited<ReturnType<typeof performanceApi.cycleStats>>["data"]>;

interface CycleWithStats extends ReviewCycle {
  stats?: CycleStats | null;
}

function PerformanceAdminPage() {
  return (
    <PermissionGuard
      permission="performance.manage"
      fallback={<div className="p-6 text-[14px] text-[#6B6B6B]">You don't have permission to manage review cycles.</div>}
    >
      <PerformanceAdminInner />
    </PermissionGuard>
  );
}

function PerformanceAdminInner() {
  const [loading, setLoading] = useState(true);
  const [cycles, setCycles] = useState<CycleWithStats[]>([]);

  const load = async () => {
    setLoading(true);
    const res = await performanceApi.listCycles();
    const list = res.data ?? [];
    const withStats = await Promise.all(
      list.map(async (c) => {
        const s = await performanceApi.cycleStats(c.id);
        return { ...c, stats: s.data };
      }),
    );
    setCycles(withStats);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const launch = async (id: string) => {
    const res = await performanceApi.setCycleStatus(id, "active");
    if (res.error) return showToast(res.error.message, "error");
    showToast("Cycle launched.", "success");
    await load();
  };

  const close = async (id: string) => {
    const res = await performanceApi.setCycleStatus(id, "completed");
    if (res.error) return showToast(res.error.message, "error");
    showToast("Cycle closed.", "success");
    await load();
  };

  const remind = async (id: string) => {
    const res = await performanceApi.sendReminders(id);
    if (res.error) return showToast(res.error.message, "error");
    showToast(`Reminders sent to ${res.data ?? 0} pending participants.`, "success");
  };

  const share = async (id: string) => {
    const res = await performanceApi.shareReviews(id);
    if (res.error) return showToast(res.error.message, "error");
    showToast(`${res.data ?? 0} reviews shared with employees.`, "success");
    await load();
  };

  const reassignChanged = async (c: CycleWithStats) => {
    const changed = c.stats?.managerChanged ?? [];
    if (changed.length === 0) return;
    const res = await performanceApi.reassignManager(changed.map((r) => r.id), changed[0].managerId);
    if (res.error) return showToast(res.error.message, "error");
    showToast(`${res.data ?? 0} reviews reassigned to the current manager.`, "success");
    await load();
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Review cycles" description="Launch, monitor and close performance review cycles." />
      {cycles.length === 0 ? (
        <EmptyState title="No review cycles yet" subtitle="Create a review cycle from Settings → Review Cycles." />
      ) : (
        <div className="space-y-4">
          {cycles.map((c) => (
            <ReviewCycleCard
              key={c.id}
              cycle={c}
              stats={c.stats ?? undefined}
              onClose={c.status !== "draft" ? () => void close(c.id) : undefined}
              actions={
                <>
                  {c.status === "draft" && <Button size="sm" variant="primary" onClick={() => void launch(c.id)}>Launch cycle</Button>}
                  {c.status !== "draft" && c.status !== "completed" && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => void remind(c.id)}>Send reminders</Button>
                      <Button size="sm" variant="ghost" onClick={() => void share(c.id)}>Share completed reviews</Button>
                      {(c.stats?.managerChanged.length ?? 0) > 0 && (
                        <Button size="sm" variant="ghost" onClick={() => void reassignChanged(c)}>
                          Acknowledge {c.stats?.managerChanged.length} manager change(s)
                        </Button>
                      )}
                    </>
                  )}
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
