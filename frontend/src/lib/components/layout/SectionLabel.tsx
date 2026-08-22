import { cn } from "@/lib/utils";

export interface SectionLabelProps {
  number: string;
  label: string;
  className?: string;
}

/** Eyebrow label such as "01 / COMPANY DETAILS". */
export function SectionLabel({ number, label, className }: SectionLabelProps) {
  return (
    <p className={cn("text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]", className)}>
      <span className="text-[#0A0A0A]">{number}</span> / {label}
    </p>
  );
}