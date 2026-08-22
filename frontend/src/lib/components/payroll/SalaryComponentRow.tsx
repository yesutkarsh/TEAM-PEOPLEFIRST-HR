import { Badge, Button } from "@/lib/components/ui";
import { formatCurrency } from "@/lib/utils/format";
import type { SalaryComponent } from "@/lib/types/payroll";

export function describeCalculation(c: SalaryComponent): string {
  switch (c.calculationMethod) {
    case "fixed":
      return `${formatCurrency(c.value ?? 0)} per month`;
    case "percentage_of_basic":
      return `${c.value ?? 0}% of Basic`;
    case "percentage_of_ctc":
      return `${c.value ?? 0}% of CTC`;
    case "balance":
      return "Balance of CTC";
    case "slab":
      return "Slab based";
    case "statutory":
      return {
        pf_employee: "12% of Basic, capped at ₹1,800/month",
        pf_employer: "12% of Basic, capped at ₹1,800/month",
        esi_employee: "0.75% of gross (gross ≤ ₹21,000)",
        esi_employer: "3.25% of gross (gross ≤ ₹21,000)",
        professional_tax: "State slab",
        tds: "Manual entry (MVP1)",
      }[c.statutoryType ?? "tds"];
    default:
      return "—";
  }
}

export interface SalaryComponentRowProps {
  component: SalaryComponent;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  onDragStart?: () => void;
  onDrop?: () => void;
  canManage?: boolean;
}

export function SalaryComponentRow({ component, onEdit, onToggleActive, onDelete, onDragStart, onDrop, canManage }: SalaryComponentRowProps) {
  return (
    <div
      draggable={!!canManage}
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="flex items-center gap-3 px-4 py-3 border-b border-[#F2F2F0] last:border-0 hover:bg-[#FAFAF8] transition-colors"
    >
      <span aria-hidden className="text-[#9CA3AF] cursor-grab select-none">≡</span>
      <span className="font-mono text-[11px] bg-[#F2F2F0] text-[#6B6B6B] rounded-sm px-2 py-1">{component.code}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-[#0A0A0A] truncate">
          {component.name}
          {!component.isActive && <span className="ml-2 text-[12px] text-[#6B6B6B]">(inactive)</span>}
        </p>
        <p className="text-[12px] text-[#6B6B6B]">{describeCalculation(component)}</p>
      </div>
      <Badge variant={component.taxable ? "success" : "default"}>{component.taxable ? "Taxable" : "Exempt"}</Badge>
      {component.isSystemDefined && <Badge variant="accent">System</Badge>}
      {canManage && (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={onEdit}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={onToggleActive}>{component.isActive ? "Deactivate" : "Activate"}</Button>
          {!component.isSystemDefined && (
            <Button size="sm" variant="ghost" className="text-[#DC2626]" onClick={onDelete}>Delete</Button>
          )}
        </div>
      )}
    </div>
  );
}