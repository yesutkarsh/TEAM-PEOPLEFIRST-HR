import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export function Card({ padded = true, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-[#E5E5E3] shadow-[0_1px_2px_rgba(10,10,10,0.04)]",
        padded && "p-6",
        className,
      )}
      {...rest}
    />
  );
}