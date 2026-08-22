/** Right-anchored slide-over panel with sticky footer slot. */
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md" | "lg";
}

const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" };

export function SlideOver({ open, onClose, title, description, children, footer, width = "md" }: SlideOverProps) {
  const triggerRef = useRef<Element | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => panelRef.current?.focus(), 50);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
      (triggerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex">
      <button
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 transition-opacity"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "relative ml-auto h-full w-full bg-white shadow-2xl flex flex-col outline-none",
          widths[width],
        )}
      >
        <div className="px-6 py-5 border-b border-[#E5E5E3] flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[18px] font-semibold text-[#0A0A0A]">{title}</h3>
            {description && <p className="mt-1 text-[13px] text-[#6B6B6B]">{description}</p>}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors text-xl leading-none p-1 -m-1"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-[#E5E5E3] bg-[#FAFAF8] flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
