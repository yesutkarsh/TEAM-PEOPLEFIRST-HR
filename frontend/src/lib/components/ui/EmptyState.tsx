/** Zero-data state — centered icon, title, subtitle, optional action. */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, subtitle, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-12 px-4", className)}>
      {icon && <div className="mb-4 text-[#9CA3AF]" aria-hidden>{icon}</div>}
      <h3 className="text-[16px] font-semibold text-[#0A0A0A]">{title}</h3>
      {subtitle && <p className="mt-1 text-[13px] text-[#6B6B6B] max-w-sm">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
