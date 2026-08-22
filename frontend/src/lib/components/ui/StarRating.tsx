/** 1–5 star rating. Read-only when no onChange is supplied. */
import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StarRatingProps {
  value: number | null;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}

const PX: Record<NonNullable<StarRatingProps["size"]>, number> = { sm: 14, md: 18, lg: 24 };

export function StarRating({ value, onChange, size = "md", showValue = true, className }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);
  const interactive = typeof onChange === "function";
  const shown = hover ?? value ?? 0;
  const px = PX[size];

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div
        role="radiogroup"
        aria-label="Candidate rating"
        className="inline-flex items-center gap-1"
        onMouseLeave={() => setHover(null)}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= shown;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} out of 5`}
              disabled={!interactive}
              tabIndex={interactive ? 0 : -1}
              onMouseEnter={() => interactive && setHover(n)}
              onClick={() => { if (onChange) onChange(n); }}
              className={cn(
                "rounded-sm outline-none transition-transform",
                interactive ? "cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--tenant-primary)] hover:scale-110" : "cursor-default",
              )}
            >
              <Star
                size={px}
                strokeWidth={1.5}
                className="transition-colors"
                style={{
                  color: filled ? "var(--tenant-accent)" : "#E5E5E3",
                  fill: filled ? "var(--tenant-accent)" : "transparent",
                }}
              />
            </button>
          );
        })}
      </div>
      {showValue && (
        <span className="text-[12px] text-[#6B6B6B]">{value ? `${value} / 5` : "Not rated"}</span>
      )}
    </div>
  );
}
