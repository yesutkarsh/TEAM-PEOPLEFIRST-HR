import { cn } from "@/lib/utils";
import type { PermissionScope } from "@/lib/types/rbac";

const OPTIONS: { value: PermissionScope; label: string }[] = [
  { value: "self", label: "Self" },
  { value: "team", label: "Team" },
  { value: "department", label: "Dept" },
  { value: "all", label: "All" },
];

export interface ScopeSelectorProps {
  value: PermissionScope;
  onChange: (scope: PermissionScope) => void;
  disabled?: boolean;
  className?: string;
}

export function ScopeSelector({ value, onChange, disabled, className }: ScopeSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Permission scope" className={cn("inline-flex rounded-md border border-[#E5E5E3] overflow-hidden", className)}>
      {OPTIONS.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "px-2.5 py-1 text-[11px] font-medium transition-colors",
              active ? "text-white" : "text-[#6B6B6B] hover:bg-[#F2F2F0]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
            style={active ? { background: "var(--tenant-primary)" } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}