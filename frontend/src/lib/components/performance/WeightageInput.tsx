/** Editable weightage list — flags when the total doesn't sum to 100. */
import { Input, Badge } from "@/lib/components/ui";

export interface WeightageItem {
  id: string;
  label: string;
  weightage: number;
}

export interface WeightageInputProps {
  items: WeightageItem[];
  onChange: (id: string, weightage: number) => void;
  disabled?: boolean;
}

export function WeightageInput({ items, onChange, disabled }: WeightageInputProps) {
  const total = items.reduce((s, i) => s + (Number(i.weightage) || 0), 0);
  const balanced = total === 100;
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div key={i.id} className="flex items-center gap-3">
          <span className="min-w-0 flex-1 text-[13px] text-[#0A0A0A] truncate">{i.label}</span>
          <Input
            type="number"
            aria-label={`${i.label} weightage`}
            value={i.weightage}
            disabled={disabled}
            onChange={(e) => onChange(i.id, Number(e.target.value))}
            className="w-24"
          />
          <span className="text-[12px] text-[#6B6B6B] w-4">%</span>
        </div>
      ))}
      <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E3]">
        <span className="text-[12px] text-[#6B6B6B]">Total weightage</span>
        <Badge variant={balanced ? "success" : "danger"}>{total}%</Badge>
      </div>
      {!balanced && (
        <p className="text-[12px] text-[#B45309]">Weightage must total 100% before this can be saved.</p>
      )}
    </div>
  );
}
