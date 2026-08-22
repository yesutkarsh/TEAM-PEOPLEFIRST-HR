/** Three-dot dropdown for status transitions. */
import { useEffect, useRef, useState } from "react";
import { ChevronDown, MoreHorizontal, AlertTriangle, ShieldCheck } from "lucide-react";
import type { EmploymentStatus } from "@/lib/types/employee";

export interface StatusTransitionMenuProps {
  status: EmploymentStatus;
  onTransition: (next: EmploymentStatus, note?: string) => void;
}

const ACTIONS: Record<EmploymentStatus, Array<{ to: EmploymentStatus; label: string; danger?: boolean }>> = {
  active: [
    { to: "notice_period", label: "Put on notice period" },
    { to: "inactive", label: "Deactivate" },
    { to: "exited", label: "Mark as exited", danger: true },
  ],
  probation: [
    { to: "active", label: "Confirm employment" },
    { to: "exited", label: "Mark as exited", danger: true },
  ],
  inactive: [
    { to: "active", label: "Reactivate" },
    { to: "exited", label: "Mark as exited", danger: true },
  ],
  notice_period: [
    { to: "exited", label: "Mark as exited", danger: true },
    { to: "active", label: "Retract notice" },
  ],
  exited: [{ to: "active", label: "Reactivate (rehire)" }],
};

export function StatusTransitionMenu({ status, onTransition }: StatusTransitionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  const actions = ACTIONS[status];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="group inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 px-3.5 py-2.5 text-xs font-semibold text-white backdrop-blur-md transition-all active:scale-95 cursor-pointer"
      >
        <MoreHorizontal className="w-4 h-4 text-neutral-300 group-hover:text-white" />
        <span>Actions</span>
        <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-transform group-aria-expanded:rotate-180" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-xl border border-[#E5E5E3] bg-white shadow-xl py-1.5 z-30 divide-y divide-[#F2F2F0] animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#8E8E8E]">
            Status Transitions
          </div>
          <div className="py-1">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onTransition(a.to);
                }}
                className={
                  "w-full text-left px-3.5 py-2 text-[13px] font-medium transition-colors flex items-center justify-between group cursor-pointer " +
                  (a.danger
                    ? "text-rose-600 hover:bg-rose-50"
                    : "text-[#0A0A0A] hover:bg-[#FAFAF9] hover:text-orange-600")
                }
              >
                <span>{a.label}</span>
                {a.danger ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 opacity-60 group-hover:opacity-100" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}