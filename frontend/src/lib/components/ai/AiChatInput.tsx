/** Auto-grow chat input with thumb-friendly bottom actions — Enter to send, Shift+Enter for newline. */
import { useEffect, useRef, useState } from "react";
import { History, SendHorizontal, SquarePen } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AiChatInputProps {
  onSend: (text: string) => void;
  onNewSession?: () => void;
  onToggleHistory?: () => void;
  disabled?: boolean;
  cooldown?: boolean;
}

export function AiChatInput({ onSend, onNewSession, onToggleHistory, disabled, cooldown }: AiChatInputProps) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value]);

  const send = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const canSend = !!value.trim() && !disabled;

  return (
    <div className="border-t border-[#E5E5E3] bg-white p-3 sm:p-3.5 space-y-2">
      <div className="flex items-end gap-1.5 sm:gap-2 bg-[#FAFAF9] p-1.5 rounded-2xl border border-[#E5E5E3] focus-within:bg-white focus-within:border-[#0A0A0A] focus-within:ring-2 focus-within:ring-orange-500/20 transition-all shadow-2xs">
        {onToggleHistory && (
          <button
            type="button"
            onClick={onToggleHistory}
            title="Conversations History"
            aria-label="Conversations History"
            className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-neutral-500 hover:text-[#0A0A0A] hover:bg-neutral-200/60 active:scale-95 transition-all cursor-pointer"
          >
            <History className="w-4 h-4" />
          </button>
        )}

        {onNewSession && (
          <button
            type="button"
            onClick={onNewSession}
            title="New Chat"
            aria-label="New Chat"
            className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-neutral-500 hover:text-orange-600 hover:bg-orange-50 active:scale-95 transition-all cursor-pointer"
          >
            <SquarePen className="w-4 h-4" />
          </button>
        )}

        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          disabled={disabled}
          placeholder="Ask about leave, payroll, policies…"
          className={cn(
            "flex-1 resize-none bg-transparent px-2.5 py-2 text-[13.5px] text-[#0A0A0A]",
            "placeholder:text-neutral-400 outline-hidden border-none",
            "disabled:opacity-60 disabled:cursor-not-allowed",
          )}
        />

        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            "h-9 w-9 shrink-0 rounded-xl flex items-center justify-center transition-all cursor-pointer",
            canSend
              ? "bg-[#0A0A0A] text-white hover:bg-orange-600 active:scale-95 shadow-2xs"
              : "bg-neutral-200 text-neutral-400 cursor-not-allowed",
          )}
        >
          <SendHorizontal className="w-4 h-4" />
        </button>
      </div>

      {cooldown && (
        <p className="mt-2 text-[11px] text-amber-700 font-medium px-1">
          Please wait a moment before sending another message.
        </p>
      )}
    </div>
  );
}


