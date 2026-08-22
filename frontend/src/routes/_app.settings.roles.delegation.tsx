import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button, SlideOver, Select, DatePicker, Textarea, EmptyState, showToast, Alert } from "@/lib/components/ui";
import { DelegationCard, PermissionGuard } from "@/lib/components/rbac";
import { listEmployees } from "@/lib/api/employees";
import { createDelegation, listDelegations, listRoles, revokeDelegation } from "@/lib/api/rbac";
import type { Delegation, Role } from "@/lib/types/rbac";
import type { Employee } from "@/lib/types/employee";

export const Route = createFileRoute("/_app/settings/roles/delegation")({
  component: DelegationPage,
  head: () => ({ meta: [{ title: "Delegation — Settings — HRMS" }] }),
});

const MAX_DAYS = 90;

function DelegationPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [open, setOpen] = useState(false);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const reload = () => {
    void Promise.all([listEmployees(), listRoles(), listDelegations()]).then(([em, rl, dl]) => {
      if (em.data) setEmployees(em.data);
      if (rl.data) setRoles(rl.data);
      if (dl.data) setDelegations(dl.data);
    });
  };
  useEffect(reload, []);

  const empName = (id: string) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.firstName} ${e.lastName}` : id;
  };
  const roleName = (id?: string) => roles.find((r) => r.id === id)?.name ?? "Role";

  const active = delegations.filter((d) => d.status === "active");
  const past = delegations.filter((d) => d.status !== "active");

  const submit = async () => {
    setErr(null);
    if (!fromId || !toId || !roleId || !start || !end) { setErr("All fields required."); return; }
    if (fromId === toId) { setErr("From and To must be different."); return; }
    const days = (new Date(end).getTime() - new Date(start).getTime()) / 86400000;
    if (days <= 0) { setErr("End date must be after start."); return; }
    if (days > MAX_DAYS) { setErr(`Max delegation is ${MAX_DAYS} days.`); return; }
    await createDelegation({
      fromEmployeeId: fromId, toEmployeeId: toId, roleId,
      startDate: new Date(start).toISOString(), endDate: new Date(end).toISOString(),
      reason: reason || undefined,
    });
    showToast(`Delegation created. ${empName(toId)} has been notified.`, "success");
    setOpen(false);
    setFromId(""); setToId(""); setRoleId(""); setStart(""); setEnd(""); setReason("");
    reload();
  };

  const onRevoke = async (id: string) => {
    await revokeDelegation(id);
    showToast("Delegation revoked.", "success");
    reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <PermissionGuard permission="settings.roles.manage">
          <Button variant="primary" onClick={() => setOpen(true)}>New delegation</Button>
        </PermissionGuard>
      </div>

      <section className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6B6B6B]">Active delegations</p>
        {active.length === 0 ? <EmptyState title="No active delegations." /> : active.map((d) => (
          <DelegationCard key={d.id} delegation={d} fromName={empName(d.fromEmployeeId)} toName={empName(d.toEmployeeId)} roleName={roleName(d.roleId)} onRevoke={onRevoke} />
        ))}
      </section>

      {past.length > 0 && (
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6B6B6B] mb-3">Past delegations</p>
          <div className="rounded-md border border-[#E5E5E3] bg-white overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#FAFAF8] text-left text-[11px] uppercase text-[#6B6B6B]">
                <tr><th className="px-3 py-2">From</th><th className="px-3 py-2">To</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Period</th><th className="px-3 py-2">Status</th></tr>
              </thead>
              <tbody>
                {past.map((d) => (
                  <tr key={d.id} className="border-t border-[#E5E5E3] text-[13px]">
                    <td className="px-3 py-2">{empName(d.fromEmployeeId)}</td>
                    <td className="px-3 py-2">{empName(d.toEmployeeId)}</td>
                    <td className="px-3 py-2">{roleName(d.roleId)}</td>
                    <td className="px-3 py-2 text-[12px]">{new Date(d.startDate).toLocaleDateString()} – {new Date(d.endDate).toLocaleDateString()}</td>
                    <td className="px-3 py-2 capitalize">{d.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <SlideOver
        open={open} onClose={() => setOpen(false)}
        title="New delegation"
        description="Temporarily grant a role to another employee."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={submit}>Create delegation</Button>
          </>
        }
      >
        {err && <Alert variant="error" className="mb-3">{err}</Alert>}
        <div className="space-y-4">
          <Select label="Delegate FROM" placeholder="Choose employee" value={fromId} onChange={(e) => setFromId(e.target.value)} options={employees.map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName}` }))} />
          <Select label="Delegate TO" placeholder="Choose employee" value={toId} onChange={(e) => setToId(e.target.value)} options={employees.map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName}` }))} />
          <Select label="Role to delegate" placeholder="Choose role" value={roleId} onChange={(e) => setRoleId(e.target.value)} options={roles.map((r) => ({ value: r.id, label: r.name }))} />
          <div className="grid grid-cols-2 gap-3">
            <DatePicker label="Start date" value={start} onChange={setStart} />
            <DatePicker label="End date" value={end} onChange={setEnd} />
          </div>
          <Textarea label="Reason (optional)" rows={2} value={reason} onChange={(e) => setReason(e.target.value.slice(0, 200))} hint={`Max ${MAX_DAYS} days. ${reason.length}/200`} />
        </div>
      </SlideOver>
    </div>
  );
}