/** Single step row for the candidate portal step list. */
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export type PortalStepState = "completed" | "active" | "locked";

export interface PortalStepItemProps {
  label: string;
  description: string;
  state: PortalStepState;
  href?: string | null;
}

export function PortalStepItem({ label, description, state, href }: PortalStepItemProps) {
  const icon =
    state === "completed" ? (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#16A34A] text-white text-[13px]">✓</span>
    ) : state === "active" ? (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--tenant-primary)] text-[var(--tenant-text-on-primary)] text-[13px]">●</span>
    ) : (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#E5E5E3] text-[#9CA3AF] text-[13px]">○</span>
    );

  const content = (
    <div className="flex items-start gap-3 py-2">
      {icon}
      <div className="min-w-0">
        <p className={cn("text-[14px] font-medium", state === "locked" ? "text-[#9CA3AF]" : "text-[#0A0A0A]")}>{label}</p>
        <p className="text-[12px] text-[#6B6B6B]">{description}</p>
      </div>
    </div>
  );

  if (href && state !== "locked") {
    return (
      <Link to={href} className="block rounded-md -mx-2 px-2 hover:bg-[#F2F2F0] transition-colors">
        {content}
      </Link>
    );
  }
  return content;
}
