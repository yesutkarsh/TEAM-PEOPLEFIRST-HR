/** List/Grid view toggle — two segmented buttons. */
import { cn } from "@/lib/utils";

export type ViewMode = "list" | "grid";

export interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  return (
    <div className={cn("inline-flex rounded-md border border-[#E5E5E3] bg-white p-0.5", className)} role="group" aria-label="View mode">
      {(["list", "grid"] as const).map((m) => {
        const active = value === m;
        return (
          <button
            key={m}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(m)}
            className={cn(
              "h-8 px-3 text-[13px] rounded-[6px] inline-flex items-center gap-1.5 transition-colors",
              active ? "bg-[#0A0A0A] text-white" : "text-[#6B6B6B] hover:bg-[#F2F2F0]",
            )}
          >
            <span aria-hidden>{m === "list" ? "☰" : "▦"}</span>
            {m === "list" ? "List" : "Grid"}
          </button>
        );
      })}
    </div>
  );
}