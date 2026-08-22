/** Breadcrumb trail. Last item is current page (not a link). */
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export function Breadcrumb({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-[13px] text-[#6B6B6B]", className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {item.to && !last ? (
                <Link to={item.to} className="hover:text-[#0A0A0A] transition-colors">{item.label}</Link>
              ) : (
                <span className={last ? "text-[#0A0A0A] font-medium" : ""} aria-current={last ? "page" : undefined}>{item.label}</span>
              )}
              {!last && <span aria-hidden className="text-[#D4D4D8]">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
