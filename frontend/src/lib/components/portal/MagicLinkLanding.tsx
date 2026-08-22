/** Shared centered card used by the magic-link landing states. */
import type { ReactNode } from "react";

export interface MagicLinkLandingProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function MagicLinkLanding({ title, description, children }: MagicLinkLandingProps) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-16">
      <h1 className="text-[20px] font-semibold text-[#0A0A0A]">{title}</h1>
      {description ? <p className="text-[14px] text-[#6B6B6B] max-w-sm">{description}</p> : null}
      {children}
    </div>
  );
}
