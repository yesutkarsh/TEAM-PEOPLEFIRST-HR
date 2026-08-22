/** Role-aware starter prompt chips shown at the start of a conversation. */
import { ArrowUpRight, Sparkles } from "lucide-react";
import type { Role } from "@/lib/types/user";

const PROMPTS_BY_ROLE: Partial<Record<Role, string[]>> = {
  employee: [
    "What's my leave balance?",
    "When is the next payroll run?",
    "What's the WFH policy?",
    "Do I have any pending approvals?",
  ],
  manager: [
    "Do I have any pending approvals?",
    "What's the WFH policy?",
    "Tell me about probation policy",
    "What's my leave balance?",
  ],
  hr_admin: [
    "What's the WFH policy?",
    "Tell me about attrition trends",
    "What's the probation policy?",
    "When is the next payroll run?",
  ],
};

const DEFAULT_PROMPTS = ["What's my leave balance?", "When is the next payroll run?", "What's the WFH policy?"];

export function AiSuggestedPrompts({ role, onSelect }: { role: string; onSelect: (prompt: string) => void }) {
  const prompts = PROMPTS_BY_ROLE[role as Role] ?? DEFAULT_PROMPTS;
  return (
    <div className="space-y-2.5 pt-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8E8E8E] flex items-center gap-1">
        <Sparkles className="w-3 h-3 text-orange-500" />
        Suggested Questions
      </p>
      <div className="flex flex-wrap gap-2">
        {prompts.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onSelect(p)}
            className="group inline-flex items-center gap-1.5 rounded-2xl border border-[#E5E5E3] bg-white px-3.5 py-2 text-[12.5px] font-medium text-[#0A0A0A] hover:border-neutral-300 hover:shadow-2xs hover:text-orange-600 transition-all cursor-pointer active:scale-95"
          >
            <span>{p}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-orange-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        ))}
      </div>
    </div>
  );
}

