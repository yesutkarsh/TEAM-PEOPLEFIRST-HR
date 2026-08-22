import { cn } from "@/lib/utils";

export interface DraftSaveIndicatorProps {
  status: "idle" | "saving" | "saved";
  className?: string;
}

export function DraftSaveIndicator({ status, className }: DraftSaveIndicatorProps) {
  if (status === "idle") return null;
  return (
    <p className={cn("text-[12px] text-[#6B6B6B]", className)} aria-live="polite">
      {status === "saving" ? "Saving…" : "Saved just now"}
    </p>
  );
}
