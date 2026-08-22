/** Accessible tab group with arrow-key navigation. */
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabsItem {
  id: string;
  label: string;
  content: ReactNode;
  /** Optional count pill rendered next to the label. */
  badge?: number;
}

export interface TabsProps {
  tabs: TabsItem[];
  defaultTab?: string;
  /** Controlled mode — pair with onTabChange (e.g. URL-synced tabs). */
  activeTab?: string;
  onTabChange?: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, defaultTab, activeTab, onTabChange, className }: TabsProps) {
  const [internal, setInternal] = useState(defaultTab ?? tabs[0]?.id);
  const active = activeTab ?? internal;
  const setActive = (id: string) => {
    setInternal(id);
    onTabChange?.(id);
  };
  const id = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next =
      e.key === "ArrowRight" ? (idx + 1) % tabs.length
      : e.key === "ArrowLeft" ? (idx - 1 + tabs.length) % tabs.length
      : e.key === "Home" ? 0 : tabs.length - 1;
    const target = tabs[next];
    setActive(target.id);
    refs.current[target.id]?.focus();
  };

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label="Tabs"
        className="flex items-center gap-1 sm:gap-2 border-b border-[#E5E5E3] overflow-x-auto no-scrollbar scroll-smooth w-full flex-nowrap pb-px"
      >
        {tabs.map((t, i) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[t.id] = el;
              }}
              role="tab"
              type="button"
              id={`${id}-trigger-${t.id}`}
              aria-controls={`${id}-panel-${t.id}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn(
                "relative px-3.5 py-2.5 sm:px-4 sm:py-3 text-[13px] sm:text-[14px] font-bold tracking-tight rounded-t-xl transition-all duration-150 outline-none whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer",
                selected
                  ? "text-[#0A0A0A] bg-[#FAFAF9]"
                  : "text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-[#FAFAF9]/60",
              )}
            >
              {t.label}
              {typeof t.badge === "number" && t.badge > 0 && (
                <span
                  className={cn(
                    "ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                    selected ? "bg-[#0A0A0A] text-white" : "bg-[#E5E5E3] text-[#6B6B6B]",
                  )}
                >
                  {t.badge}
                </span>
              )}
              {selected && (
                <span
                  className="absolute inset-x-0 -bottom-px h-0.5 bg-[#0A0A0A] rounded-full"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${id}-panel-${t.id}`}
          aria-labelledby={`${id}-trigger-${t.id}`}
          hidden={t.id !== active}
          className="pt-6"
        >
          {t.id === active && t.content}
        </div>
      ))}
    </div>
  );
}
