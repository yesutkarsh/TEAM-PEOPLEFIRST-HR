/** Renders the list of sources an AI answer was grounded on. */
import { FileText, Database, BookOpen } from "lucide-react";
import type { AiSource } from "@/lib/types/ai";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<AiSource["type"], { label: string; icon: any }> = {
  policy_doc: { label: "Policy", icon: BookOpen },
  data_query: { label: "Data", icon: Database },
  general_knowledge: { label: "General", icon: FileText },
};

export function AiSourceCitation({ sources, className }: { sources: AiSource[]; className?: string }) {
  if (!sources.length) return null;
  return (
    <div className={cn("mt-2.5 flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#F2F2F0]", className)}>
      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8E8E8E] mr-1">Sources:</span>
      {sources.map((s, i) => {
        const cfg = TYPE_CONFIG[s.type];
        const Icon = cfg.icon;
        return (
          <span
            key={`${s.label}-${i}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E5E3] bg-[#FAFAF9] px-2.5 py-0.5 text-[11px] font-semibold text-neutral-700 shadow-2xs"
            title={cfg.label}
          >
            <Icon className="w-3 h-3 text-orange-600" />
            <span>{s.label}</span>
          </span>
        );
      })}
    </div>
  );
}

