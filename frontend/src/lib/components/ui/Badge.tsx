import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "accent" | "tenant-accent" | "success" | "warning" | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-[#F2F2F0] text-[#0A0A0A]",
  accent: "bg-[#F97316] text-white",
  "tenant-accent": "bg-[var(--tenant-accent)] text-white",
  success: "bg-[#16A34A]/10 text-[#15803D]",
  warning: "bg-[#F59E0B]/15 text-[#B45309]",
  danger: "bg-[#DC2626]/10 text-[#B91C1C]",
};

export function Badge({ variant = "default", className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]",
        variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}