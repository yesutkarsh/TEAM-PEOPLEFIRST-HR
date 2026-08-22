/** 420px right slide-in AI chat panel, minimal chrome. */
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ExternalLink, MoreHorizontal, Sparkles, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/lib/components/ui";
import { uiStore } from "@/lib/store/ui";
import { cn } from "@/lib/utils";
import { useAiChat } from "./useAiChat";
import { AiChatMessageBubble, AiThinkingBubble } from "./AiChatMessageBubble";
import { AiChatInput } from "./AiChatInput";
import { AiSuggestedPrompts } from "./AiSuggestedPrompts";
import { AiUnavailableState } from "./AiUnavailableState";

export function AiChatPanel() {
  const open = uiStore.useSelector((s) => s.aiPanelOpen);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chat = useAiChat(open);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat.activeSession?.messages.length, chat.sending]);

  const messages = chat.activeSession?.messages ?? [];
  const lastIsError = messages[messages.length - 1]?.isError;

  return (
    <div
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-40 pointer-events-none",
        open && "pointer-events-auto",
      )}
    >
      <button
        aria-label="Close AI assistant"
        onClick={uiStore.closeAiPanel}
        className={cn(
          "absolute inset-0 bg-black/20 backdrop-blur-xs transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI Assistant"
        className={cn(
          "absolute right-0 top-0 h-full w-full sm:w-[420px] bg-[#FAFAF9] border-l border-[#E5E5E3] shadow-2xl flex flex-col",
          "transition-transform duration-[250ms] ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Minimal Header */}
        <div className="h-14 shrink-0 border-b border-[#E5E5E3] bg-white px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div>
              <h3 className="text-[14px] font-bold text-[#0A0A0A] tracking-tight">AI Assistant</h3>
              <p className="text-[11px] text-[#8E8E8E] font-medium">HR Assistant & Knowledge Base</p>
            </div>
          </div>


          <div className="flex items-center gap-1 relative">
            <button
              type="button"
              aria-label="More options"
              onClick={() => setMenuOpen((v) => !v)}
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[#FAFAF9] transition-colors text-neutral-500 hover:text-[#0A0A0A] cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-10 w-48 rounded-xl border border-[#E5E5E3] bg-white shadow-xl z-20 overflow-hidden py-1 divide-y divide-[#F2F2F0] animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmClear(true);
                  }}
                  className="w-full text-left px-3.5 py-2 text-[12.5px] font-medium text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>Clear conversation</span>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <Link
                  to="/ai-assistant"
                  onClick={() => {
                    setMenuOpen(false);
                    uiStore.closeAiPanel();
                  }}
                  className="px-3.5 py-2 text-[12.5px] font-medium text-[#0A0A0A] hover:bg-[#FAFAF9] hover:text-orange-600 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>Open full page</span>
                  <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                </Link>
              </div>
            )}

            <button
              type="button"
              aria-label="Close"
              onClick={uiStore.closeAiPanel}
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[#FAFAF9] transition-colors text-neutral-500 hover:text-[#0A0A0A] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages scroll area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {messages.map((m) => (
            <AiChatMessageBubble
              key={m.id}
              message={m}
              onFeedback={(v) => chat.setFeedback(m.id, v ?? null)}
            />
          ))}
          {chat.sending && <AiThinkingBubble />}
          {lastIsError && !chat.sending && <AiUnavailableState />}
          {messages.filter((m) => m.role === "user").length === 0 && (
            <AiSuggestedPrompts role={chat.role} onSelect={(p) => void chat.send(p)} />
          )}
        </div>

        {/* Input bar */}
        <AiChatInput
          onSend={(t) => void chat.send(t)}
          onNewSession={() => void chat.newSession()}
          disabled={chat.sending || chat.cooldown}
          cooldown={chat.cooldown}
        />
      </div>


      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear conversation"
        description="This will permanently remove your chat history with the AI assistant. This cannot be undone."
        confirmLabel="Clear"
        variant="danger"
        onConfirm={() => chat.clearConversation()}
      />
    </div>
  );
}

