/** 9-box performance × potential grid. Click a cell to place the selected employee. */
import { EmployeeAvatar } from "@/lib/components/employees";
import { cn } from "@/lib/utils";
import type { Employee } from "@/lib/types/employee";
import type { NineBoxPosition, Review } from "@/lib/types/performance";

export interface NineBoxCellEntry {
  review: Review;
  employee: Employee;
}

export interface NineBoxGridProps {
  entries: NineBoxCellEntry[];
  selectedReviewId?: string | null;
  onSelect?: (reviewId: string) => void;
  onPlace?: (reviewId: string, position: NineBoxPosition) => void;
}

const POTENTIALS: NineBoxPosition["potential"][] = ["high", "medium", "low"];
const PERFORMANCES: NineBoxPosition["performance"][] = ["low", "medium", "high"];

const CELL_LABEL: Record<string, string> = {
  "low-high": "Enigma", "medium-high": "Growth potential", "high-high": "Star",
  "low-medium": "Inconsistent", "medium-medium": "Core player", "high-medium": "High performer",
  "low-low": "Risk", "medium-low": "Solid citizen", "high-low": "Trusted expert",
};

export function NineBoxGrid({ entries, selectedReviewId, onSelect, onPlace }: NineBoxGridProps) {
  const byCell = new Map<string, NineBoxCellEntry[]>();
  entries.forEach((e) => {
    if (!e.review.ninebox) return;
    const key = `${e.review.ninebox.performance}-${e.review.ninebox.potential}`;
    byCell.set(key, [...(byCell.get(key) ?? []), e]);
  });

  return (
    <div className="grid grid-cols-3 gap-2">
      {POTENTIALS.map((pot) =>
        PERFORMANCES.map((perf) => {
          const key = `${perf}-${pot}`;
          const cellEntries = byCell.get(key) ?? [];
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (selectedReviewId && onPlace) onPlace(selectedReviewId, { performance: perf, potential: pot });
              }}
              className={cn(
                "min-h-[110px] rounded-md border border-[#E5E5E3] bg-white p-2 text-left align-top transition-colors",
                selectedReviewId && "hover:bg-[#FAFAF8] cursor-pointer",
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">{CELL_LABEL[key]}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {cellEntries.map(({ review, employee }) => (
                  <span
                    key={review.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); onSelect?.(review.id); }}
                    title={`${employee.firstName} ${employee.lastName}`}
                    className={cn(
                      "inline-flex rounded-full ring-2",
                      selectedReviewId === review.id ? "ring-[var(--tenant-primary)]" : "ring-transparent",
                    )}
                  >
                    <EmployeeAvatar employee={employee} size="sm" />
                  </span>
                ))}
              </div>
            </button>
          );
        }),
      )}
      <div className="col-span-3 flex justify-between text-[11px] text-[#6B6B6B] px-1">
        <span>← Low performance</span>
        <span>High performance →</span>
      </div>
    </div>
  );
}
