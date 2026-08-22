/** Numeric rating selector driven by the cycle's rating scale. */
import { cn } from "@/lib/utils";
import type { RatingScale } from "@/lib/types/performance";

export interface RatingInputProps {
  scale: RatingScale;
  value?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  label?: string;
}

export function RatingInput({ scale, value, onChange, disabled, label }: RatingInputProps) {
  const active = scale.labels.find((l) => l.value === value);
  return (
    <div>
      {label && <p className="mb-1.5 text-[13px] font-medium text-[#0A0A0A]">{label}</p>}
      <div role="radiogroup" aria-label={label ?? "Rating"} className="inline-flex rounded-md border border-[#E5E5E3] overflow-hidden">
        {scale.labels.map((l) => {
          const on = l.value === value;
          return (
            <button
              key={l.value}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={disabled}
              title={l.label}
              onClick={() => onChange?.(l.value)}
              className={cn(
                "min-w-9 px-3 py-1.5 text-[13px] font-medium tabular-nums transition-colors border-r border-[#E5E5E3] last:border-r-0",
                on ? "text-white" : "text-[#6B6B6B] hover:bg-[#F2F2F0]",
                "disabled:opacity-60 disabled:cursor-not-allowed",
              )}
              style={on ? { background: "var(--tenant-primary)" } : undefined}
            >
              {l.value}
            </button>
          );
        })}
      </div>
      {active && <p className="mt-1.5 text-[12px] text-[#6B6B6B]">{active.value} — {active.label}</p>}
    </div>
  );
}
