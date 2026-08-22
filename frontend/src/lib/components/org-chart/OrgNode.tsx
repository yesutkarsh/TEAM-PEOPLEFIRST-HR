/** Single org chart card. */
import type { Employee } from "@/lib/types/employee";
import { EmployeeAvatar } from "@/lib/components/employees/EmployeeAvatar";
import { cn } from "@/lib/utils";

export interface OrgNodeProps {
  employee: Employee;
  highlighted?: boolean;
  hasChildren?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  designationName?: string;
}

export function OrgNode({ employee, highlighted, hasChildren, collapsed, onToggle, designationName }: OrgNodeProps) {
  return (
    <div
      className={cn(
        "rounded-md border bg-white px-3 py-2 inline-flex items-center gap-2 min-w-[180px] transition-all",
        highlighted
          ? "border-[var(--tenant-primary)] shadow-md"
          : "border-[#E5E5E3] hover:border-[var(--tenant-primary)]/40",
      )}
    >
      <EmployeeAvatar employee={employee} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-[#0A0A0A] truncate">
          {employee.firstName} {employee.lastName}
        </p>
        <p className="text-[11px] text-[#6B6B6B] truncate">{designationName ?? "—"}</p>
      </div>
      {hasChildren && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand" : "Collapse"}
          className="h-5 w-5 rounded-sm text-[#6B6B6B] hover:bg-[#F2F2F0]"
        >
          {collapsed ? "+" : "−"}
        </button>
      )}
    </div>
  );
}