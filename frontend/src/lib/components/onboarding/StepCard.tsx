import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface StepCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Container for an onboarding step's heading + content + footer. */
export function StepCard({ title, description, children, footer, className }: StepCardProps) {
  return (
    <div className={cn("w-full", className)}>
      <h1 className="text-[48px] leading-[1.05] font-bold tracking-[-0.01em] text-[#0A0A0A]">{title}</h1>
      {description && <p className="mt-3 text-[15px] text-[#6B6B6B] max-w-xl">{description}</p>}
      <div className="mt-10">{children}</div>
      {footer && <div className="mt-10 flex items-center justify-between gap-4">{footer}</div>}
    </div>
  );
}