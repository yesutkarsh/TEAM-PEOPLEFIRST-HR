import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Breadcrumb, Button } from "@/lib/components/ui";
import { TenantTable } from "@/lib/components/superadmin";
import { adminApi } from "@/lib/api/admin";
import type { TenantSummary } from "@/lib/types/admin";

export const Route = createFileRoute("/_admin/admin/tenants")({
  component: TenantsPage,
  head: () => ({ meta: [{ title: "Tenants — HRMS Admin" }] }),
});

function TenantsPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const res = await adminApi.listTenants();
    if (res.data) setTenants(res.data);
    setLoading(false);
  };

  useEffect(() => { void reload(); }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Breadcrumb items={[{ label: "Platform", to: "/admin/dashboard" }, { label: "Tenants" }]} />
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[32px] font-bold tracking-[-0.01em]">Tenants</h1>
          <p className="mt-1 text-[14px] text-[#6B6B6B]">Every company on HRMS.</p>
        </div>
        <Button onClick={() => navigate({ to: "/admin/tenants/new" })}>+ New tenant</Button>
      </div>
      <TenantTable data={tenants} loading={loading} onChange={reload} />
    </div>
  );
}
