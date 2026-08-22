/** Coloured pill for EmploymentStatus. */
import { cn } from "@/lib/utils";
import { EMPLOYMENT_STATUS_LABELS, type EmploymentStatus } from "@/lib/types/employee";

const styles: Record<EmploymentStatus, { badge: string; dot: string }> = {
  active: {
    badge: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  probation: {
    badge: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    dot: "bg-amber-500",
  },
  inactive: {
    badge: "bg-neutral-100 text-neutral-600 border-neutral-200",
    dot: "bg-neutral-400",
  },
  notice_period: {
    badge: "bg-orange-500/10 text-orange-700 border-orange-500/20",
    dot: "bg-orange-500",
  },
  exited: {
    badge: "bg-rose-500/10 text-rose-700 border-rose-500/20",
    dot: "bg-rose-500",
  },
};

export interface EmployeeStatusBadgeProps {
  status: EmploymentStatus;
  size?: "sm" | "md";
  className?: string;
}

export function EmployeeStatusBadge({ status, size = "md", className }: EmployeeStatusBadgeProps) {
  const style = styles[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wider uppercase shadow-2xs backdrop-blur-xs",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
        style.badge,
        className,
      )}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {status === "active" && (
          <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping", style.dot)} />
        )}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", style.dot)} />
      </span>
      {EMPLOYMENT_STATUS_LABELS[status]}
    </span>
  );
}