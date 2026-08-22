/** Ultra-minimal top-bar icon button that opens the AI chat panel. */
import { Sparkles } from "lucide-react";
import { uiStore } from "@/lib/store/ui";

export function AiTopBarButton() {
  return (
    <button
      type="button"
      title="Ask AI"
      aria-label="Ask AI"
      onClick={uiStore.toggleAiPanel}
      className="w-8 h-8 rounded-full bg-[#FAFAF9] border border-[#E5E5E3] hover:bg-[#F2F2F0] text-[#0A0A0A] hover:border-neutral-400 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
    >
      <Sparkles className="w-4 h-4 text-[#0A0A0A]" aria-hidden />
    </button>
  );
}



