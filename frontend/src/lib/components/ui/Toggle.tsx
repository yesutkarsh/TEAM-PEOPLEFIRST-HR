/** Accessible on/off pill switch. */
import { cn } from "@/lib/utils";

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  label?: string;
  className?: string;
}

export function Toggle({ checked, onChange, disabled, size = "md", label, className }: ToggleProps) {
  const w = size === "sm" ? "w-8 h-[18px]" : "w-10 h-6";
  const dot = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  const translate = size === "sm" ? (checked ? "translate-x-3.5" : "translate-x-0.5") : (checked ? "translate-x-[18px]" : "translate-x-0.5");
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-[var(--tenant-primary)] focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        w,
        checked ? "" : "bg-[#D1D5DB]",
        className,
      )}
      style={checked ? { background: "var(--tenant-primary)" } : undefined}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block rounded-full bg-white shadow transform transition-transform duration-150",
          dot,
          translate,
        )}
      />
    </button>
  );
}