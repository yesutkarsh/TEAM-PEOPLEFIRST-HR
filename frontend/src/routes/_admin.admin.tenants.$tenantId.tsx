import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Avatar, Breadcrumb, Button, Card, Input, Tabs } from "@/lib/components/ui";
import { ThemePreview } from "@/lib/components/onboarding";
import { TenantStatusBadge } from "@/lib/components/superadmin";
import { showToast } from "@/lib/components/ui/Toast";
import { ConfirmDialog } from "@/lib/components/ui";
import { adminApi } from "@/lib/api/admin";
import { impersonationStateStore } from "@/lib/store/auth";
import type { TenantActivityEntry, TenantStatus, TenantSummary } from "@/lib/types/admin";

export const Route = createFileRoute("/_admin/admin/tenants/$tenantId")({
  component: TenantDetailPage,
  head: ({ params }) => ({ meta: [{ title: `Tenant — ${params.tenantId}` }] }),
});

function TenantDetailPage() {
  const { tenantId } = Route.useParams();
  const navigate = useNavigate();
  const [t, setT] = useState<TenantSummary | null>(null);
  const [activity, setActivity] = useState<TenantActivityEntry[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [confirm, setConfirm] = useState<"suspend" | "activate" | "delete" | null>(null);

  const load = async () => {
    const [r, a] = await Promise.all([adminApi.getTenant(tenantId), adminApi.getActivity(tenantId)]);
    if (r.data) {
      setT(r.data);
      setName(r.data.companyName);
      setDomain(r.data.tenant?.settings.domain ?? "");
    }
    if (a.data) setActivity(a.data);
  };
  useEffect(() => { void load(); }, [tenantId]);

  if (!t) return <p className="text-[#6B6B6B]">Loading tenant…</p>;

  const impersonate = () => {
    impersonationStateStore.start(t.id, t.companyName);
    showToast(`Now viewing as ${t.companyName}`, "warning");
    navigate({ to: "/dashboard" });
  };

  const saveBasics = async () => {
    const res = await adminApi.updateTenantBasics(t.id, { companyName: name, domain });
    if (res.error) { showToast(res.error.message, "error"); return; }
    showToast("Tenant updated", "success");
    setEditing(false);
    await load();
  };

  const onConfirm = async () => {
    if (!confirm) return;
    if (confirm === "delete") {
      await adminApi.deleteTenant(t.id);
      showToast("Tenant deleted", "success");
      navigate({ to: "/admin/tenants" });
      return;
    }
    const next: TenantStatus = confirm === "suspend" ? "suspended" : "active";
    await adminApi.setStatus(t.id, next);
    showToast(`Status set to ${next}`, "success");
    await load();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Breadcrumb items={[
        { label: "Platform", to: "/admin/dashboard" },
        { label: "Tenants", to: "/admin/tenants" },
        { label: t.companyName },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar name={t.companyName} size={48} />
            <div>
              <h2 className="text-[20px] font-semibold">{t.companyName}</h2>
              <p className="text-[12px] text-[#6B6B6B]">{t.industry}</p>
            </div>
          </div>
          <div className="space-y-2 text-[13px]">
            <Row k="Status" v={<TenantStatusBadge status={t.status} />} />
            <Row k="Plan" v={t.plan} />
            <Row k="Employees" v={t.employees.toLocaleString()} />
            <Row k="Domain" v={t.tenant?.settings.domain ?? "—"} />
            <Row k="Joined" v={new Date(t.joinedAt).toLocaleDateString()} />
            <Row k="HR contact" v={t.tenant?.settings.hrContactName ?? "—"} />
            <Row k="Email" v={t.tenant?.settings.hrContactEmail ?? "—"} />
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="secondary" onClick={impersonate}>Impersonate</Button>
            {t.status === "suspended" ? (
              <Button variant="secondary" onClick={() => setConfirm("activate")}>Reactivate</Button>
            ) : (
              <Button variant="secondary" onClick={() => setConfirm("suspend")}>Suspend</Button>
            )}
            <Button variant="danger" onClick={() => setConfirm("delete")}>Delete tenant</Button>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <Tabs
            className="px-6 pt-4"
            tabs={[
              {
                id: "overview",
                label: "Overview",
                content: (
                  <div className="space-y-6 pb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <Stat label="Employees" value={t.employees.toLocaleString()} />
                      <Stat label="Plan" value={t.plan} />
                      <Stat label="Subscription renews" value="Auto-renews monthly" />
                      <Stat label="Trial ends" value={t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString() : "—"} />
                    </div>
                    {t.tenant && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B] mb-2">Brand preview</p>
                        <ThemePreview primary={t.tenant.theme.primaryColor} secondary={t.tenant.theme.secondaryColor} accent={t.tenant.theme.accentColor} companyName={t.companyName} />
                      </div>
                    )}
                  </div>
                ),
              },
              {
                id: "activity",
                label: "Activity log",
                content: (
                  <div className="pb-6">
                    {activity.length === 0 ? (
                      <p className="text-[14px] text-[#6B6B6B] py-6">No activity recorded.</p>
                    ) : (
                      <ul className="divide-y divide-[#F2F2F0]">
                        {activity.map((a) => (
                          <li key={a.id} className="py-3">
                            <p className="text-[14px]">{a.action}</p>
                            <p className="text-[12px] text-[#6B6B6B] mt-0.5">{new Date(a.timestamp).toLocaleString()} · {a.actor}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ),
              },
              {
                id: "settings",
                label: "Settings",
                content: (
                  <div className="space-y-4 pb-6">
                    {editing ? (
                      <>
                        <Input label="Company name" value={name} onChange={(e) => setName(e.target.value)} />
                        <Input label="Domain" value={domain} onChange={(e) => setDomain(e.target.value)} />
                        <div className="flex gap-2">
                          <Button onClick={saveBasics}>Save</Button>
                          <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <Stat label="Name" value={t.companyName} />
                          <Stat label="Domain" value={t.tenant?.settings.domain ?? "—"} />
                          <Stat label="Industry" value={t.industry} />
                          <Stat label="Size" value={t.tenant?.settings.size ?? "—"} />
                          <Stat label="Country" value={t.tenant?.settings.country ?? "—"} />
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit name & domain</Button>
                      </>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === "delete" ? "Delete tenant?" : confirm === "suspend" ? "Suspend tenant?" : "Reactivate tenant?"}
        description={confirm === "delete"
          ? `Delete ${t.companyName} permanently. This cannot be undone.`
          : confirm === "suspend"
          ? `${t.companyName} will lose access until reactivated.`
          : `${t.companyName} will regain access to the platform.`}
        confirmLabel={confirm === "delete" ? "Delete" : confirm === "suspend" ? "Suspend" : "Reactivate"}
        variant={confirm === "delete" ? "danger" : "warning"}
        onConfirm={onConfirm}
      />
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[#6B6B6B]">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">{label}</p>
      <p className="mt-1 text-[14px]">{value}</p>
    </div>
  );
}
