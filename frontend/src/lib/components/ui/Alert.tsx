import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AlertVariant = "info" | "success" | "warning" | "error";

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const variants: Record<AlertVariant, string> = {
  info: "bg-[#EFF6FF] text-[#1E3A8A] border-[#BFDBFE]",
  success: "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]",
  warning: "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]",
  error: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
};

export function Alert({ variant = "info", title, children, onDismiss, className }: AlertProps) {
  return (
    <div role="alert" className={cn("rounded-md border px-4 py-3 text-[14px] flex items-start gap-3", variants[variant], className)}>
      <div className="flex-1">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        {children}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss" className="text-current opacity-70 hover:opacity-100">
          ×
        </button>
      )}
    </div>
  );
}