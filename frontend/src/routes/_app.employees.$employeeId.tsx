import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Breadcrumb, Card, Tabs, EmptyState, showToast, Spinner } from "@/lib/components/ui";
import { DocumentVault, ProfileCompletenessBar, ProfileHeader, EmployeeLeaveTab, EmployeeAttendanceTab, EmployeeCompensationTab, EmployeePerformanceTab } from "@/lib/components/employees";
import { computeCompleteness, getEmployee, setStatus, updateDocument } from "@/lib/api/employees";
import { settingsApi, type Department, type Designation } from "@/lib/api/settings";
import type { Employee, EmploymentStatus } from "@/lib/types/employee";
import { EmployeeAccessTab } from "@/lib/components/rbac/EmployeeAccessTab";

export const Route = createFileRoute("/_app/employees/$employeeId")({
  component: EmployeeProfilePage,
  head: () => ({ meta: [{ title: "Employee — HRMS" }] }),
});

function EmployeeProfilePage() {
  const { employeeId } = useParams({ from: "/_app/employees/$employeeId" });
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [r, d, dz] = await Promise.all([getEmployee(employeeId), settingsApi.listDepartments(), settingsApi.listDesignations()]);
    if (r.data) setEmployee(r.data);
    if (d.data) setDepartments(d.data);
    if (dz.data) setDesignations(dz.data);
    setLoading(false);
  };
  useEffect(() => {
    void load();
  }, [employeeId]);

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
  }
  if (!employee) {
    return <EmptyState title="Employee not found" subtitle="They may have been removed." />;
  }

  const deptName = departments.find((d) => d.id === employee.departmentId)?.name;
  const desigName = designations.find((d) => d.id === employee.designationId)?.name;
  const completeness = computeCompleteness(employee);

  const onTransition = async (next: EmploymentStatus) => {
    const r = await setStatus(employee.id, next);
    if (r.data) {
      setEmployee(r.data);
      showToast(`Status changed to ${next.replace("_", " ")}`, "success");
    }
  };

  const onDocUpdate = async (docId: string, patch: Parameters<typeof updateDocument>[2]) => {
    const r = await updateDocument(employee.id, docId, patch);
    if (r.data) setEmployee(r.data);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Employees", to: "/employees" }, { label: `${employee.firstName} ${employee.lastName}` }]} />
      <ProfileHeader
        employee={employee}
        departmentName={deptName}
        designationName={desigName}
        onEdit={() => navigate({ to: "/employees/$employeeId/edit", params: { employeeId: employee.id } })}
        onTransition={onTransition}
      />
      <ProfileCompletenessBar percentage={completeness.pct} missingFields={completeness.missing} />

      <Tabs
        tabs={[
          {
            id: "overview",
            label: "Overview",
            content: (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <h3 className="text-[13px] font-semibold text-[#0A0A0A] mb-3">Personal info</h3>
                  <DL pairs={[
                    ["Personal email", employee.personalEmail],
                    ["Work email", employee.workEmail],
                    ["Phone", employee.phone],
                    ["DOB", employee.dateOfBirth?.slice(0, 10) ?? "—"],
                    ["Gender", employee.gender ?? "—"],
                    ["Blood group", employee.bloodGroup ?? "—"],
                    ["Nationality", employee.nationality ?? "—"],
                  ]} />
                  <h3 className="text-[13px] font-semibold text-[#0A0A0A] mt-5 mb-3">Address</h3>
                  <p className="text-[13px] text-[#0A0A0A]">
                    {employee.currentAddress
                      ? `${employee.currentAddress.line1}, ${employee.currentAddress.city}, ${employee.currentAddress.state} ${employee.currentAddress.pincode}, ${employee.currentAddress.country}`
                      : "—"}
                  </p>
                  <h3 className="text-[13px] font-semibold text-[#0A0A0A] mt-5 mb-3">Emergency contact</h3>
                  <p className="text-[13px] text-[#0A0A0A]">
                    {employee.emergencyContact ? `${employee.emergencyContact.name} (${employee.emergencyContact.relationship}) — ${employee.emergencyContact.phone}` : "—"}
                  </p>
                </Card>
                <div className="space-y-4">
                  <Card>
                    <h3 className="text-[13px] font-semibold text-[#0A0A0A] mb-3">Professional</h3>
                    <DL pairs={[
                      ["Department", deptName ?? "—"],
                      ["Designation", desigName ?? "—"],
                      ["Grade", employee.grade ?? "—"],
                      ["Employment type", employee.employmentType],
                      ["Joined", employee.dateOfJoining.slice(0, 10)],
                      ["Probation ends", employee.probationEndDate?.slice(0, 10) ?? "—"],
                      ["Work location", employee.workLocation ?? "—"],
                    ]} />
                  </Card>
                  <Card>
                    <h3 className="text-[13px] font-semibold text-[#0A0A0A] mb-3">System</h3>
                    <DL pairs={[
                      ["Employee code", employee.employeeCode],
                      ["Role", employee.role ?? "—"],
                      ["Added", new Date(employee.createdAt).toLocaleDateString()],
                      ["Updated", new Date(employee.updatedAt).toLocaleDateString()],
                    ]} />
                  </Card>
                </div>
              </div>
            ),
          },
          { id: "documents", label: "Documents", content: <DocumentVault employee={employee} canVerify onUpdateDoc={onDocUpdate} /> },
          { id: "access", label: "Access", content: <EmployeeAccessTab employee={employee} /> },
          { id: "compensation", label: "Compensation", content: <EmployeeCompensationTab employee={employee} /> },
          { id: "leave", label: "Leave", content: <EmployeeLeaveTab employee={employee} /> },
          { id: "attendance", label: "Attendance", content: <EmployeeAttendanceTab employee={employee} /> },
          { id: "performance", label: "Performance", content: <EmployeePerformanceTab employee={employee} /> },
          {
            id: "timeline",
            label: "Activity",
            content: (
              <Card>
                <ul className="space-y-3">
                  {employee.timeline.map((t) => (
                    <li key={t.id} className="text-[13px]">
                      <span className="text-[#0A0A0A] font-medium">{t.actor}</span>{" "}
                      <span className="text-[#6B6B6B]">— {t.message}</span>{" "}
                      <span className="text-[#9CA3AF]">· {new Date(t.at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}

function DL({ pairs }: { pairs: Array<[string, string]> }) {
  return (
    <dl className="grid grid-cols-2 gap-y-2 text-[13px]">
      {pairs.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-[#6B6B6B]">{k}</dt>
          <dd className="text-[#0A0A0A]">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}