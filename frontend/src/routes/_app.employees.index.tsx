import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import {
  Breadcrumb,
  Button,
  Badge,
  DataTable,
  EmptyState,
  ViewToggle,
  type ViewMode,
  type ColumnDef,
  showToast,
  ConfirmDialog,
} from "@/lib/components/ui";
import {
  EmployeeAvatar,
  EmployeeCard,
  EmployeeSearchFilters,
  EmployeeStatusBadge,
  BulkActionsBar,
} from "@/lib/components/employees";
import {
  archiveEmployees,
  downloadCsv,
  employeesToCsv,
  listEmployees,
} from "@/lib/api/employees";
import { settingsApi, type Department, type Designation } from "@/lib/api/settings";
import {
  EMPLOYMENT_TYPE_LABELS,
  type Employee,
  type EmployeeFilters,
} from "@/lib/types/employee";
import { PermissionGuard } from "@/lib/components/rbac";

export const Route = createFileRoute("/_app/employees/")({
  component: EmployeesPage,
  head: () => ({ meta: [{ title: "Employees — HRMS" }] }),
});

const VIEW_KEY = "hrms.employees.viewMode";

function EmployeesPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("list");
  const [filters, setFilters] = useState<EmployeeFilters>({});
  const [list, setList] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [confirmArchive, setConfirmArchive] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const v = window.localStorage.getItem(VIEW_KEY);
      if (v === "list" || v === "grid") setView(v);
    }
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(VIEW_KEY, view);
  }, [view]);

  useEffect(() => {
    void Promise.all([settingsApi.listDepartments(), settingsApi.listDesignations()]).then(([d, dz]) => {
      if (d.data) setDepartments(d.data);
      if (dz.data) setDesignations(dz.data);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    void listEmployees(filters).then((r) => {
      if (r.data) setList(r.data);
      setLoading(false);
    });
  }, [filters]);

  const deptName = (id: string) => departments.find((d) => d.id === id)?.name ?? "—";
  const desigName = (id: string) => designations.find((d) => d.id === id)?.name ?? "—";

  const columns: ColumnDef<Employee>[] = useMemo(
    () => [
      {
        key: "name",
        label: "Employee",
        render: (e) => (
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              aria-label={`Select ${e.firstName} ${e.lastName}`}
              onClick={(ev) => ev.stopPropagation()}
              checked={selection.has(e.id)}
              onChange={() =>
                setSelection((s) => {
                  const n = new Set(s);
                  if (n.has(e.id)) n.delete(e.id);
                  else n.add(e.id);
                  return n;
                })
              }
              className="h-4 w-4 accent-[#0A0A0A] rounded cursor-pointer shrink-0"
            />
            <EmployeeAvatar employee={e} size="sm" className="rounded-xl shrink-0" />
            <div className="min-w-0">
              <Link
                to="/employees/$employeeId"
                params={{ employeeId: e.id }}
                className="font-bold text-[14px] text-[#0A0A0A] hover:text-orange-600 transition-colors truncate block"
              >
                {e.firstName} {e.lastName}
              </Link>
              <span className="inline-block mt-0.5 px-2 py-0.2 rounded-md bg-[#FAFAF9] border border-[#E5E5E3] font-bold text-[10px] text-[#6B6B6B] tabular-nums">
                {e.employeeCode}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: "dept",
        label: "Department",
        render: (e) => <span className="font-semibold text-[#0A0A0A]">{deptName(e.departmentId)}</span>,
      },
      {
        key: "desig",
        label: "Designation",
        render: (e) => <span className="font-medium text-[#404040]">{desigName(e.designationId)}</span>,
      },
      {
        key: "type",
        label: "Type",
        render: (e) => (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-[#FAFAF9] text-[#0A0A0A] border border-[#E5E5E3]">
            {EMPLOYMENT_TYPE_LABELS[e.employmentType]}
          </span>
        ),
      },
      { key: "status", label: "Status", render: (e) => <EmployeeStatusBadge status={e.employmentStatus} size="sm" /> },
      {
        key: "joined",
        label: "Joined",
        render: (e) => (
          <span className="text-[12px] font-semibold text-[#6B6B6B] tabular-nums">
            {new Date(e.dateOfJoining).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        ),
      },
      {
        key: "actions",
        label: "Action",
        align: "right",
        render: (e) => (
          <Link
            to="/employees/$employeeId"
            params={{ employeeId: e.id }}
            onClick={(ev) => ev.stopPropagation()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FAFAF9] hover:bg-[#0A0A0A] text-[#0A0A0A] hover:text-white border border-[#E5E5E3] hover:border-[#0A0A0A] font-bold text-[11px] transition-all duration-200 shadow-2xs group/btn shrink-0"
          >
            View Profile
            <ArrowUpRight className="w-3 h-3 text-[#8E8E8E] group-hover/btn:text-white transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
          </Link>
        ),
      },
    ],
    [selection, departments, designations],
  );

  const onExport = () => {
    const rows = selection.size ? list.filter((e) => selection.has(e.id)) : list;
    downloadCsv("employees.csv", employeesToCsv(rows));
    showToast(`Exported ${rows.length} employees`, "success");
  };

  const doArchive = async () => {
    await archiveEmployees(Array.from(selection));
    showToast(`${selection.size} archived`, "success");
    setSelection(new Set());
    const r = await listEmployees(filters);
    if (r.data) setList(r.data);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Employees" }]} />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-[28px] font-bold tracking-[-0.02em]">Employees</h1>
          <Badge variant="default">{list.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <PermissionGuard permission="employees.export">
            <Button variant="secondary" onClick={onExport}>Export all</Button>
          </PermissionGuard>
          <PermissionGuard permission="employees.create">
            <Button variant="primary" onClick={() => navigate({ to: "/employees/new" })}>Add employee</Button>
          </PermissionGuard>
        </div>
      </div>

      <EmployeeSearchFilters
        filters={filters}
        onChange={setFilters}
        departments={departments}
        designations={designations}
      />

      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[#6B6B6B]">{list.length} result{list.length === 1 ? "" : "s"}</p>
        <ViewToggle value={view} onChange={setView} />
      </div>

      {selection.size > 0 && (
        <BulkActionsBar
          count={selection.size}
          onExport={onExport}
          onArchive={() => setConfirmArchive(true)}
          onClear={() => setSelection(new Set())}
        />
      )}

      {view === "list" ? (
        <DataTable
          columns={columns}
          data={list}
          loading={loading}
          getRowKey={(e) => e.id}
          emptyState={
            <EmptyState
              title={Object.keys(filters).length === 0 ? "No employees yet" : "No employees match your filters"}
              subtitle={Object.keys(filters).length === 0 ? "Add your first employee to get started." : "Try clearing some filters."}
              action={
                Object.keys(filters).length === 0 ? (
                  <Button onClick={() => navigate({ to: "/employees/new" })}>Add employee</Button>
                ) : (
                  <Button variant="secondary" onClick={() => setFilters({})}>Clear filters</Button>
                )
              }
            />
          }
        />
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[220px] rounded-md border border-[#E5E5E3] bg-white animate-pulse" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState title="No employees match your filters" action={<Button variant="secondary" onClick={() => setFilters({})}>Clear filters</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((e) => (
            <EmployeeCard key={e.id} employee={e} designationName={desigName(e.designationId)} departmentName={deptName(e.departmentId)} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title={`Archive ${selection.size} employee${selection.size === 1 ? "" : "s"}?`}
        description="They will be marked Inactive. You can reactivate them later from their profile."
        confirmLabel="Archive"
        variant="danger"
        onConfirm={doArchive}
      />
    </div>
  );
}