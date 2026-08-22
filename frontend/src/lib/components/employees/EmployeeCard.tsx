/** Modern Bento Card for employee profiles, supporting grid and list layouts. */
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { Employee } from "@/lib/types/employee";
import { EmployeeAvatar } from "./EmployeeAvatar";
import { EmployeeStatusBadge } from "./EmployeeStatusBadge";
import { cn } from "@/lib/utils";

export interface EmployeeCardProps {
  employee: Employee;
  designationName?: string;
  departmentName?: string;
  variant?: "grid" | "list";
  className?: string;
}

export function EmployeeCard({
  employee,
  designationName,
  departmentName,
  variant = "grid",
  className,
}: EmployeeCardProps) {
  if (variant === "list") {
    return (
      <Link
        to="/employees/$employeeId"
        params={{ employeeId: employee.id }}
        className={cn(
          "group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-[#E5E5E3] bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-200 hover:border-[#D1D1CF] hover:shadow-md overflow-hidden",
          className,
        )}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <EmployeeAvatar
            employee={employee}
            size="md"
            showStatus
            status={employee.employmentStatus}
            className="shrink-0 rounded-xl"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-[15px] text-[#0A0A0A] tracking-tight truncate group-hover:text-orange-600 transition-colors">
                {employee.firstName} {employee.lastName}
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-[#FAFAF9] border border-[#E5E5E3] font-bold text-[11px] text-[#6B6B6B] tabular-nums">
                {employee.employeeCode}
              </span>
              <EmployeeStatusBadge status={employee.employmentStatus} size="sm" />
            </div>
            <p className="text-[13px] font-medium text-[#6B6B6B] truncate mt-0.5">
              {designationName ?? "—"} <span className="text-[#D4D4D8]">·</span> {departmentName ?? "—"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FAFAF9] group-hover:bg-[#0A0A0A] text-[#0A0A0A] group-hover:text-white border border-[#E5E5E3] group-hover:border-[#0A0A0A] font-bold text-[12px] transition-all duration-200 shadow-2xs">
            View Profile
            <ArrowUpRight className="w-3.5 h-3.5 text-[#8E8E8E] group-hover:text-white transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to="/employees/$employeeId"
      params={{ employeeId: employee.id }}
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl border border-[#E5E5E3] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D1D1CF] hover:shadow-md overflow-hidden",
        className,
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-4">
          <EmployeeStatusBadge status={employee.employmentStatus} size="sm" />
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-[#FAFAF9] text-[#8E8E8E] border border-[#E5E5E3] group-hover:bg-[#0A0A0A] group-hover:text-white group-hover:border-[#0A0A0A] transition-colors">
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>

        <div className="flex flex-col items-center text-center pt-1">
          <EmployeeAvatar
            employee={employee}
            size="lg"
            showStatus
            status={employee.employmentStatus}
            className="rounded-2xl"
          />

          <h3 className="mt-3.5 font-bold text-[15px] text-[#0A0A0A] tracking-tight truncate w-full group-hover:text-orange-600 transition-colors">
            {employee.firstName} {employee.lastName}
          </h3>

          <p className="mt-0.5 text-[13px] font-medium text-[#404040] truncate w-full">
            {designationName ?? "—"}
          </p>

          <p className="mt-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#8E8E8E] truncate w-full">
            {departmentName ?? "—"}
          </p>
        </div>
      </div>

      <div className="mt-5 pt-3.5 border-t border-[#F2F2F0] flex items-center justify-between text-[11px] text-[#8E8E8E]">
        <span className="font-semibold text-[#6B6B6B]">
          Code: <span className="text-[#0A0A0A] font-bold tabular-nums">{employee.employeeCode}</span>
        </span>
        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FAFAF9] group-hover:bg-[#0A0A0A] text-[#0A0A0A] group-hover:text-white border border-[#E5E5E3] group-hover:border-[#0A0A0A] font-bold text-[11px] transition-all duration-200 shadow-2xs">
          View Profile
          <ArrowUpRight className="w-3 h-3 text-[#8E8E8E] group-hover:text-white transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}