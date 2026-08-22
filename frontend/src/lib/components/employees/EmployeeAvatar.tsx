/** Avatar with initials fallback + optional status dot. */
import { cn } from "@/lib/utils";
import type { EmploymentStatus } from "@/lib/types/employee";

const sizeMap = { sm: 28, md: 40, lg: 64, xl: 80 } as const;

const statusColor: Record<EmploymentStatus, { bg: string; dot: string }> = {
  active: { bg: "bg-emerald-500", dot: "bg-emerald-500" },
  probation: { bg: "bg-amber-500", dot: "bg-amber-500" },
  inactive: { bg: "bg-neutral-400", dot: "bg-neutral-400" },
  notice_period: { bg: "bg-orange-500", dot: "bg-orange-500" },
  exited: { bg: "bg-rose-500", dot: "bg-rose-500" },
};

export interface EmployeeAvatarProps {
  employee: { firstName: string; lastName: string; avatarUrl?: string };
  size?: keyof typeof sizeMap;
  showStatus?: boolean;
  status?: EmploymentStatus;
  className?: string;
}

export function EmployeeAvatar({ employee, size = "md", showStatus, status, className }: EmployeeAvatarProps) {
  const px = sizeMap[size];
  const initials = (employee.firstName[0] ?? "?") + (employee.lastName[0] ?? "");
  const s = status ? statusColor[status] : undefined;

  return (
    <span className={cn("relative inline-flex shrink-0 select-none", className)} style={{ width: px, height: px }}>
      {employee.avatarUrl ? (
        <img
          src={employee.avatarUrl}
          alt={`${employee.firstName} ${employee.lastName}`}
          className="h-full w-full rounded-full object-cover ring-2 ring-white/20 shadow-sm"
        />
      ) : (
        <span
          className="h-full w-full rounded-full inline-flex items-center justify-center font-bold uppercase tracking-wider shadow-sm ring-1 ring-black/5 bg-gradient-to-br from-neutral-800 to-neutral-900 text-white"
          style={{
            fontSize: Math.max(10, Math.round(px * 0.38)),
          }}
        >
          {initials}
        </span>
      )}
      {showStatus && status && s && (
        <span className="absolute bottom-0 right-0 flex items-center justify-center">
          {status === "active" && (
            <span
              className={cn("absolute rounded-full animate-ping opacity-75", s.bg)}
              style={{
                width: Math.max(8, Math.round(px * 0.24)),
                height: Math.max(8, Math.round(px * 0.24)),
              }}
            />
          )}
          <span
            aria-label={status}
            className={cn("relative rounded-full ring-2 ring-white shadow-xs", s.dot)}
            style={{
              width: Math.max(8, Math.round(px * 0.24)),
              height: Math.max(8, Math.round(px * 0.24)),
            }}
          />
        </span>
      )}
    </span>
  );
}