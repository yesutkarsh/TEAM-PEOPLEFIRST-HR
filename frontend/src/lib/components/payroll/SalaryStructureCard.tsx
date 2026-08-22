import { Badge, Button, Card } from "@/lib/components/ui";
import type { SalaryStructure } from "@/lib/types/payroll";

export interface SalaryStructureCardProps {
  structure: SalaryStructure;
  onClone: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
  canManage?: boolean;
}

export function SalaryStructureCard({ structure, onClone, onSetDefault, onDelete, canManage }: SalaryStructureCardProps) {
  return (
    <Card className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[18px] font-semibold text-[#0A0A0A]">{structure.name}</h3>
          {structure.isDefault && <Badge variant="tenant-accent">Default</Badge>}
          {!structure.isActive && <Badge>Inactive</Badge>}
        </div>
        {structure.description && <p className="mt-1 text-[13px] text-[#6B6B6B]">{structure.description}</p>}
        <p className="mt-2 text-[13px] text-[#6B6B6B]">
          {structure.components.length} components · {structure.employeeCount} employees assigned
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {canManage && (
          <>
            <Button size="sm" variant="ghost" onClick={onClone}>Clone</Button>
            {!structure.isDefault && <Button size="sm" variant="ghost" onClick={onSetDefault}>Set as default</Button>}
            <Button size="sm" variant="ghost" className="text-[#DC2626]" onClick={onDelete}>Delete</Button>
          </>
        )}
      </div>
    </Card>
  );
}