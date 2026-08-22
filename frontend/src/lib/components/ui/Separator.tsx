import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Separator({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div role="separator" className={cn("h-px w-full bg-[#E5E5E3]", className)} {...rest} />;
}