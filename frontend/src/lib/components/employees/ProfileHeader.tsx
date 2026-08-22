/** Top section of employee profile page. */
import { Edit3, Sparkles } from "lucide-react";
import { Button } from "@/lib/components/ui";
import type { Employee, EmploymentStatus } from "@/lib/types/employee";
import { EmployeeAvatar } from "./EmployeeAvatar";
import { EmployeeStatusBadge } from "./EmployeeStatusBadge";
import { StatusTransitionMenu } from "./StatusTransitionMenu";

export interface ProfileHeaderProps {
  employee: Employee;
  departmentName?: string;
  designationName?: string;
  onEdit: () => void;
  onTransition: (next: EmploymentStatus) => void;
}

export function ProfileHeader({ employee, departmentName, designationName, onEdit, onTransition }: ProfileHeaderProps) {
  return (
    <div className="rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-800 text-white shadow-md relative overflow-hidden p-6 sm:p-7 border border-neutral-800">
      <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 min-w-0">
          <EmployeeAvatar employee={employee} size="xl" showStatus status={employee.employmentStatus} className="shrink-0" />
          
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-neutral-200 border border-white/15 backdrop-blur-md">
                <Sparkles className="w-3 h-3 text-orange-400" />
                {employee.employeeCode}
              </span>
              <EmployeeStatusBadge status={employee.employmentStatus} size="sm" />
            </div>

            {/* Page Title - Unchanged Content */}
            <h1 className="text-[28px] sm:text-[34px] font-extrabold tracking-tight text-white font-sans truncate">
              {employee.firstName} {employee.lastName}
            </h1>

            <p className="text-[14px] font-medium text-neutral-300 flex flex-wrap items-center gap-2">
              <span>{designationName ?? "—"}</span>
              <span className="text-neutral-500">•</span>
              <span className="text-neutral-400">{departmentName ?? "—"}</span>
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2.5 shrink-0 self-start md:self-center">
          <button
            type="button"
            onClick={onEdit}
            className="group inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-neutral-300 group-hover:text-white" />
            Edit Profile
          </button>
          <StatusTransitionMenu status={employee.employmentStatus} onTransition={onTransition} />
        </div>
      </div>
    </div>
  );
}