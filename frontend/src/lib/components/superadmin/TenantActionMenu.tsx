/** Three-dot menu with tenant actions. */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TenantAction {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export function TenantActionMenu({ actions }: { actions: TenantAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Tenant actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="h-8 w-8 rounded-sm hover:bg-[#F2F2F0] flex items-center justify-center text-[#6B6B6B]"
      >
        ⋯
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-20 w-48 rounded-md border border-[#E5E5E3] bg-white shadow-lg py-1"
        >
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              role="menuitem"
              disabled={a.disabled}
              onClick={() => { setOpen(false); a.onClick(); }}
              className={cn(
                "block w-full text-left px-3 py-2 text-[13px] hover:bg-[#F2F2F0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                a.destructive && "text-[#DC2626]",
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
