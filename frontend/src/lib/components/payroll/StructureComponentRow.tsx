import { Button, Toggle } from "@/lib/components/ui";
import { formatCurrency } from "@/lib/utils/format";
import type { SalaryStructureComponent } from "@/lib/types/payroll";
import { describeCalculation } from "./SalaryComponentRow";

const typeIcon = {
  earning: { glyph: "↑", className: "text-[#15803D]" },
  deduction: { glyph: "↓", className: "text-[#B91C1C]" },
  employer_contribution: { glyph: "→", className: "text-[#6B6B6B]" },
} as const;

export interface StructureComponentRowProps {
  item: SalaryStructureComponent;
  computedAmount?: number;
  onToggleEditable: (editable: boolean) => void;
  onRemove: () => void;
  readOnly?: boolean;
}

export function StructureComponentRow({ item, computedAmount, onToggleEditable, onRemove, readOnly }: StructureComponentRowProps) {
  const icon = typeIcon[item.component.type];
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#F2F2F0] last:border-0">
      <span aria-hidden className="text-[#9CA3AF] select-none">≡</span>
      <span aria-hidden className={`text-[14px] font-bold ${icon.className}`}>{icon.glyph}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium truncate">{item.component.name}</p>
        <p className="text-[12px] text-[#6B6B6B]">{describeCalculation(item.component)}</p>
      </div>
      <span className="text-[13px] tabular-nums text-[#0A0A0A] w-28 text-right">
        {computedAmount === undefined ? "—" : `${formatCurrency(computedAmount)}/mo`}
      </span>
      {!readOnly && (
        <>
          <span className="flex items-center gap-2 text-[12px] text-[#6B6B6B]">
            Editable
            <Toggle size="sm" checked={item.isEditable} onChange={onToggleEditable} label="Editable per employee" />
          </span>
          <Button size="sm" variant="ghost" className="text-[#DC2626]" onClick={onRemove}>Remove</Button>
        </>
      )}
    </div>
  );
}