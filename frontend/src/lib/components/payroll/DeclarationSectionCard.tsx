import { Card, CurrencyInput, ProgressBar } from "@/lib/components/ui";
import { formatCurrency } from "@/lib/utils/format";
import type { DeclarationSection } from "@/lib/types/payroll";

export interface DeclarationSectionCardProps {
  section: DeclarationSection;
  onItemChange: (itemId: string, amount: number | null) => void;
  readOnly?: boolean;
}

export function DeclarationSectionCard({ section, onItemChange, readOnly }: DeclarationSectionCardProps) {
  const total = section.items.reduce((n, i) => n + (i.amount || 0), 0);
  const pct = section.maxLimit > 0 ? Math.min(100, Math.round((total / section.maxLimit) * 100)) : 0;
  const overLimit = total > section.maxLimit;

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-semibold text-[#0A0A0A]">{section.label}</h3>
          <p className="text-[12px] text-[#6B6B6B] mt-0.5">Limit: {formatCurrency(section.maxLimit)}</p>
        </div>
        <div className="text-right">
          <p className="text-[16px] font-semibold tabular-nums">{formatCurrency(Math.min(total, section.maxLimit))}</p>
          {overLimit && <p className="text-[11px] text-[#B45309]">{formatCurrency(total - section.maxLimit)} over limit</p>}
        </div>
      </div>
      <ProgressBar value={pct} className="mt-3" />
      <div className="mt-4 space-y-3">
        {section.items.map((item) => (
          <CurrencyInput
            key={item.id}
            label={item.label}
            value={item.amount}
            onChange={(v) => onItemChange(item.id, v)}
            min={0}
            disabled={readOnly}
          />
        ))}
      </div>
    </Card>
  );
}
