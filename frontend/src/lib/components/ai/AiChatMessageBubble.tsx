/** A single chat message bubble — user right/obsidian dark, assistant left/white. */
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import type { AiChatMessage } from "@/lib/types/ai";
import { cn } from "@/lib/utils";
import { AiSourceCitation } from "./AiSourceCitation";
import { AiFeedbackButtons } from "./AiFeedbackButtons";

export interface AiChatMessageBubbleProps {
  message: AiChatMessage;
  onFeedback?: (value: AiChatMessage["feedback"]) => void;
  onFeedbackNote?: (note: string) => void;
}

export function AiChatMessageBubble({ message, onFeedback, onFeedbackNote }: AiChatMessageBubbleProps) {
  const isUser = message.role === "user";

  if (message.isError) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-[13px] text-rose-800 flex items-start gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>{message.content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed whitespace-pre-wrap transition-all",
          isUser
            ? "bg-[#0A0A0A] text-white shadow-xs"
            : "bg-white border border-[#E5E5E3] text-[#0A0A0A] shadow-2xs",
        )}
      >
        {message.content}
        {!isUser && message.sources && message.sources.length > 0 && <AiSourceCitation sources={message.sources} />}
        {!isUser && message.unverified && (
          <p className="mt-2 text-[12px] text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-200/60 font-medium">
            This answer could not be verified against your company data — please confirm with HR.
          </p>
        )}
        {!isUser && onFeedback && (
          <AiFeedbackButtons value={message.feedback} onChange={onFeedback} onNote={onFeedbackNote} />
        )}
      </div>
    </div>
  );
}

export function AiThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl bg-white border border-[#E5E5E3] px-4 py-3 text-[13px] text-neutral-600 flex items-center gap-2.5 shadow-2xs">
        <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
        <span className="font-medium animate-pulse">Thinking…</span>
      </div>
    </div>
  );
}

