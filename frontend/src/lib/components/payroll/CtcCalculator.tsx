/** Live CTC → breakup calculator used in the structure builder and salary assignment. */
import { useMemo } from "react";
import { Card, CurrencyInput } from "@/lib/components/ui";
import { computeBreakup } from "@/lib/api/payroll";
import { formatCurrency } from "@/lib/utils/format";
import type { SalaryStructure } from "@/lib/types/payroll";
import { SalaryBreakupTable } from "./SalaryBreakupTable";

export interface CtcCalculatorProps {
  structure: SalaryStructure;
  annualCtc: number | null;
  onCtcChange?: (value: number | null) => void;
  showInput?: boolean;
}

export function CtcCalculator({ structure, annualCtc, onCtcChange, showInput = true }: CtcCalculatorProps) {
  const breakup = useMemo(() => computeBreakup(structure, annualCtc ?? 0), [structure, annualCtc]);
  const monthlyCtc = Math.round((annualCtc ?? 0) / 12);
  const allocated = breakup.grossEarnings + breakup.totalEmployerContrib;
  const diff = monthlyCtc - allocated;

  return (
    <Card className="sticky top-6">
      {showInput && (
        <CurrencyInput
          label="Annual CTC"
          value={annualCtc}
          onChange={(v) => onCtcChange?.(v)}
          min={0}
          hint={`Monthly CTC: ${formatCurrency(monthlyCtc)}`}
        />
      )}
      <SalaryBreakupTable breakup={breakup} className="mt-4" />
      <div className="mt-5 border-t border-[#E5E5E3] pt-3">
        {diff > 0 ? (
          <p className="text-[12px] text-[#B45309]">
            Components account for {formatCurrency(allocated)} of {formatCurrency(monthlyCtc)} monthly CTC.{" "}
            {formatCurrency(diff)} is unallocated — consider adding a balance component.
          </p>
        ) : diff < 0 ? (
          <p className="text-[12px] text-[#B91C1C]">
            Component total ({formatCurrency(allocated)}) exceeds monthly CTC ({formatCurrency(monthlyCtc)}). Adjust component values.
          </p>
        ) : (
          <p className="text-[12px] text-[#15803D] font-medium">Annual CTC verified: {formatCurrency(annualCtc ?? 0)} ✓</p>
        )}
      </div>
    </Card>
  );
}