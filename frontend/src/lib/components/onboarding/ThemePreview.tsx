/** Static 280x180 miniature panel previewing the tenant's brand colors. */
import { computeTextColor } from "@/lib/themes/utils";
import { cn } from "@/lib/utils";

export interface ThemePreviewProps {
  primary: string;
  secondary: string;
  accent: string;
  companyName?: string;
  className?: string;
}

export function ThemePreview({ primary, secondary, accent, companyName = "Acme Inc.", className }: ThemePreviewProps) {
  const onPrimary = computeTextColor(primary);
  const onSecondary = computeTextColor(secondary);
  return (
    <div
      className={cn("rounded-md overflow-hidden border border-[#E5E5E3] shadow-sm select-none", className)}
      style={{ width: 280, height: 180 }}
      aria-label="Theme preview"
    >
      <div className="flex h-full">
        <div style={{ width: 40, background: secondary, color: onSecondary }} className="flex flex-col items-center pt-3 gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ background: primary }} />
          <span className="h-1.5 w-5 rounded-full" style={{ background: onSecondary, opacity: 0.25 }} />
          <span className="h-1.5 w-5 rounded-full" style={{ background: onSecondary, opacity: 0.15 }} />
        </div>
        <div className="flex-1 bg-white flex flex-col">
          <div className="h-8 px-3 flex items-center border-b border-[#E5E5E3]">
            <span className="text-[11px] font-semibold" style={{ color: primary }}>{companyName}</span>
          </div>
          <div className="flex-1 p-3">
            <div className="rounded-sm border border-[#E5E5E3] p-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="h-1.5 w-12 rounded-full bg-[#E5E5E3]" />
                <span className="text-[8px] font-semibold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-full" style={{ background: accent, color: computeTextColor(accent) }}>NEW</span>
              </div>
              <span className="h-1 w-20 rounded-full bg-[#F2F2F0] block mb-1" />
              <span className="h-1 w-16 rounded-full bg-[#F2F2F0] block mb-3" />
              <span
                className="inline-flex items-center text-[9px] font-semibold rounded-sm px-2 py-1"
                style={{ background: primary, color: onPrimary }}
              >
                Continue
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}