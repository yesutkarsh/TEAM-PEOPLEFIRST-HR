/** Small colored dot for inline status indicators. */
import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "neutral" | "info";

const tones: Record<StatusTone, string> = {
  success: "bg-[#16A34A]",
  warning: "bg-[#F59E0B]",
  danger: "bg-[#DC2626]",
  neutral: "bg-[#9CA3AF]",
  info: "bg-[#2563EB]",
};

export function StatusDot({ tone = "neutral", className }: { tone?: StatusTone; className?: string }) {
  return <span aria-hidden className={cn("inline-block h-2 w-2 rounded-full", tones[tone], className)} />;
}
