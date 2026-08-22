import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/lib/components/layout";
import { Button, Card, DataTable, SearchInput, Select, Spinner, showToast, type ColumnDef } from "@/lib/components/ui";
import { LeaveTypeBadge } from "@/lib/components/leave";
import { leaveApi } from "@/lib/api/leave";
import { listEmployees } from "@/lib/api/employees";
import { settingsApi, type Department } from "@/lib/api/settings";
import type { Employee } from "@/lib/types/employee";
import type { LeaveBalance, LeaveType } from "@/lib/types/leave";

export const Route = createFileRoute("/_app/leave/balances")({
  component: BalancesPage,
  pendingComponent: () => <div className="flex justify-center py-20"><Spinner size={28} /></div>,
  head: () => ({
    meta: [
      { title: "Leave Balances — HRMS" },
      { name: "description", content: "HR overview of every employee's leave balance across all leave types." },
      { property: "og:title", content: "Leave Balances — HRMS" },
      { property: "og:description", content: "HR overview of every employee's leave balance across all leave types." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

interface Row { employee: Employee; balances: LeaveBalance[] }

function BalancesPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [q, setQ] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [emps, lt, depts] = await Promise.all([
        listEmployees(),
        leaveApi.listLeaveTypes(false),
        settingsApi.listDepartments(),
      ]);
      const employees = emps.data ?? [];
      const balances = await Promise.all(employees.map((e) => leaveApi.listBalances(e.id)));
      if (!alive) return;
      setTypes(lt.data ?? []);
      setDepartments(depts.data ?? []);
      setRows(employees.map((e, i) => ({ employee: e, balances: balances[i].data ?? [] })));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (departmentId && r.employee.departmentId !== departmentId) return false;
      if (q) {
        const name = `${r.employee.firstName} ${r.employee.lastName}`.toLowerCase();
        if (!name.includes(q.toLowerCase()) && !r.employee.employeeCode.toLowerCase().includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, departmentId, q]);

  const columns: ColumnDef<Row>[] = [
    {
      key: "employee",
      label: "Employee",
      render: (r) => (
        <div>
          <p className="font-medium">{r.employee.firstName} {r.employee.lastName}</p>
          <p className="text-[12px] text-[#6B6B6B]">{r.employee.employeeCode}</p>
        </div>
      ),
    },
    ...types.map((t): ColumnDef<Row> => ({
      key: t.id,
      label: t.code,
      align: "right",
      render: (r) => {
        const b = r.balances.find((x) => x.leaveTypeId === t.id);
        return b ? <span className={b.available <= 2 ? "text-[#B45309] font-semibold" : ""}>{b.available}</span> : <span className="text-[#D4D4D8]">—</span>;
      },
    })),
  ];

  const onExport = () => {
    const header = ["Employee Code", "Name", "Department", ...types.map((t) => t.code)];
    const lines = filtered.map((r) => [
      r.employee.employeeCode,
      `${r.employee.firstName} ${r.employee.lastName}`,
      departments.find((d) => d.id === r.employee.departmentId)?.name ?? "",
      ...types.map((t) => String(r.balances.find((b) => b.leaveTypeId === t.id)?.available ?? "")),
    ]);
    const csv = [header, ...lines].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leave-balances.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${filtered.length} employee balances`, "success");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave balances"
        description="Available leave balance for every employee, by leave type."
        actions={<Button variant="secondary" onClick={onExport}>Export CSV</Button>}
      />

      <div className="flex flex-wrap gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search by name or code…" className="max-w-xs" />
        <Select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          placeholder="All departments"
          options={departments.map((d) => ({ value: d.id, label: d.name }))}
          className="w-56"
        />
      </div>

      <Card padded={false} className="p-0">
        <DataTable columns={columns} data={filtered} loading={loading} getRowKey={(r) => r.employee.id} />
      </Card>
    </div>
  );
}
