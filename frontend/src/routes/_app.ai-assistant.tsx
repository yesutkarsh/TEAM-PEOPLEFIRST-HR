/** Full-page AI Assistant — session rail + chat column. */
import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Sparkles } from "lucide-react";
import { Breadcrumb, Button, EmptyState, Modal } from "@/lib/components/ui";
import { usePermission } from "@/lib/hooks/usePermission";
import {
  AiChatMessageBubble,
  AiThinkingBubble,
  AiChatInput,
  AiSessionList,
  AiSuggestedPrompts,
  AiUnavailableState,
  useAiChat,
} from "@/lib/components/ai";

export const Route = createFileRoute("/_app/ai-assistant")({
  component: AiAssistantPage,
  head: () => ({
    meta: [
      { title: "AI Assistant — HRMS" },
      { name: "description", content: "Ask the HR assistant about leave, payroll, policies and your pending approvals." },
      { property: "og:title", content: "AI Assistant — HRMS" },
      { property: "og:description", content: "Ask the HR assistant about leave, payroll, policies and your pending approvals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AiAssistantPage() {
  const canChat = usePermission("ai.chat");
  const [mobileSessionsOpen, setMobileSessionsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chat = useAiChat(true);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat.activeSession?.messages.length, chat.sending]);

  if (!canChat) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={[{ label: "AI Assistant" }]} />
        <EmptyState
          title="You don't have access to the AI Assistant"
          subtitle="Contact your administrator if you believe this is a mistake."
        />
      </div>
    );
  }

  const messages = chat.activeSession?.messages ?? [];
  const lastIsError = messages[messages.length - 1]?.isError;

  const sessionRail = (
    <AiSessionList
      sessions={chat.sessions}
      activeId={chat.activeSession?.id}
      onSelect={(id) => {
        void chat.selectSession(id);
        setMobileSessionsOpen(false);
      }}
      onNew={() => {
        void chat.newSession();
        setMobileSessionsOpen(false);
      }}
    />
  );

  return (
    <div className="flex flex-col h-[calc(100dvh-185px)] md:h-[calc(100vh-115px)] space-y-3">
      <div className="md:hidden shrink-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setMobileSessionsOpen(true)}
          className="rounded-xl w-full flex items-center justify-center font-bold shrink-0 py-2.5"
        >
          <MessageSquare className="w-4 h-4 mr-2 text-orange-600 shrink-0" />
          <span className="shrink-0">Conversations</span>
        </Button>
      </div>

      <div className="flex flex-1 min-h-0 gap-4">
        {/* Desktop Session Sidebar */}
        <div className="hidden md:block w-64 shrink-0 rounded-2xl border border-[#E5E5E3] bg-white overflow-hidden shadow-xs">
          {sessionRail}
        </div>

        {/* Chat Main Column */}
        <div className="flex-1 min-w-0 rounded-2xl border border-[#E5E5E3] bg-[#FAFAF9] shadow-xs flex flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4">
            {messages.map((m) => (
              <AiChatMessageBubble key={m.id} message={m} onFeedback={(v) => chat.setFeedback(m.id, v ?? null)} />
            ))}
            {chat.sending && <AiThinkingBubble />}
            {lastIsError && !chat.sending && <AiUnavailableState />}
            {messages.filter((m) => m.role === "user").length === 0 && (
              <AiSuggestedPrompts role={chat.role} onSelect={(p) => void chat.send(p)} />
            )}
          </div>
          <AiChatInput
            onSend={(t) => void chat.send(t)}
            onNewSession={() => void chat.newSession()}
            onToggleHistory={() => setMobileSessionsOpen(true)}
            disabled={chat.sending || chat.cooldown}
            cooldown={chat.cooldown}
          />
        </div>
      </div>


      <Modal open={mobileSessionsOpen} onClose={() => setMobileSessionsOpen(false)} title="Conversations">
        <div className="h-96 -mx-6 -mb-6">{sessionRail}</div>
      </Modal>
    </div>
  );
}



