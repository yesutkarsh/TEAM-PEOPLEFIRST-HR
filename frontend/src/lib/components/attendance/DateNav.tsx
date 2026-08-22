/** Compact date navigator with prev/next/today controls. */
import { Button, DatePicker } from "@/lib/components/ui";
import { dateKey } from "@/lib/utils/attendanceChecks";

export interface DateNavProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  maxDate?: string;
}

export function DateNav({ value, onChange, maxDate }: DateNavProps) {
  const shift = (days: number) => {
    const d = new Date(`${value}T00:00:00`);
    d.setDate(d.getDate() + days);
    onChange(dateKey(d));
  };
  const label = new Date(`${value}T00:00:00`).toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const today = dateKey(new Date());
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="secondary" size="sm" onClick={() => shift(-1)} aria-label="Previous day">
        ←
      </Button>
      <div className="flex items-center gap-2">
        <DatePicker value={value} onChange={onChange} maxDate={maxDate} />
        <span className="text-[13px] text-[#6B6B6B] hidden sm:inline">{label}</span>
      </div>
      <Button variant="secondary" size="sm" onClick={() => shift(1)} disabled={value >= today} aria-label="Next day">
        →
      </Button>
      {value !== today && (
        <Button variant="ghost" size="sm" onClick={() => onChange(today)}>
          Today
        </Button>
      )}
    </div>
  );
}
