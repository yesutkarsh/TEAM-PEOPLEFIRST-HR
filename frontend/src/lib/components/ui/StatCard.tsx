/** KPI metric card with modern bento styling, optional dark mode contrast, and micro-trend indicators. */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendDir?: "up" | "down" | "neutral";
  icon?: ReactNode;
  variant?: "default" | "dark" | "accent";
  accent?: "tenant" | "platform" | "none";
  actionHint?: boolean;
  className?: string;
  children?: ReactNode;
}

const trendColor = {
  up: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/60",
  down: "text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200/60",
  neutral: "text-[#6B6B6B] bg-[#F4F4F2] border-[#E5E5E3]",
};

export function StatCard({
  label,
  value,
  trend,
  trendDir = "neutral",
  icon,
  variant = "default",
  accent,
  actionHint = false,
  className,
  children,
}: StatCardProps) {
  const isDark = variant === "dark";
  const isAccent = variant === "accent" || accent === "platform";


  return (
    <div
      className={cn(
        "relative rounded-2xl p-5 overflow-hidden transition-all duration-200 group flex flex-col justify-between",
        isDark
          ? "bg-[#111111] text-white border border-[#222222] shadow-sm hover:border-[#333333]"
          : isAccent
          ? "bg-gradient-to-br from-[#1E1E1E] to-[#0A0A0A] text-white border border-[#2D2D2D] shadow-sm"
          : "bg-white border border-[#E5E5E3] text-[#0A0A0A] shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-[#D1D1CF]",
        className,
      )}
    >
      {/* Background visual highlight gradient */}
      <div
        className={cn(
          "absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-40 transition-opacity duration-300 group-hover:opacity-70",
          isDark || isAccent ? "bg-orange-500/20" : "bg-neutral-200/60",
        )}
        aria-hidden
      />

      <div>
        <div className="flex items-center justify-between gap-3">
          <p
            className={cn(
              "text-[11px] font-semibold uppercase tracking-[0.1em]",
              isDark || isAccent ? "text-neutral-400" : "text-[#6B6B6B]",
            )}
          >
            {label}
          </p>
          <div className="flex items-center gap-1.5">
            {icon && (
              <span
                className={cn(
                  "p-1 rounded-md text-sm",
                  isDark || isAccent ? "text-neutral-400" : "text-[#8E8E8E]",
                )}
                aria-hidden
              >
                {icon}
              </span>
            )}
            {actionHint && (
              <span
                className={cn(
                  "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
                  isDark || isAccent
                    ? "bg-[#262626] text-white border border-[#3A3A3A]"
                    : "bg-[#F4F4F2] text-[#0A0A0A] border border-[#E5E5E3]",
                )}
                aria-hidden
              >
                ↗
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-2 flex-wrap">
          <p className="text-[34px] sm:text-[38px] leading-none font-bold tracking-tight font-sans">
            {value}
          </p>
          {trend && (
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                isDark || isAccent ? "bg-white/10 text-neutral-200 border-white/15" : trendColor[trendDir],
              )}
            >
              {trend}
            </span>
          )}
        </div>
      </div>

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

