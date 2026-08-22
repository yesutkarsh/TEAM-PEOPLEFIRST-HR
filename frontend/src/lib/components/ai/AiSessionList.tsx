/** List of prior AI chat sessions for the current employee. */
import { MessageSquare, Plus } from "lucide-react";
import type { AiChatSession } from "@/lib/types/ai";
import { relativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export interface AiSessionListProps {
  sessions: AiChatSession[];
  activeId?: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export function AiSessionList({ sessions, activeId, onSelect, onNew }: AiSessionListProps) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-3 border-b border-[#E5E5E3]">
        <button
          type="button"
          onClick={onNew}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A0A0A] hover:bg-neutral-800 text-white px-3.5 py-2.5 text-[13px] font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-orange-400" />
          <span>New Conversation</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#F2F2F0]">
        {sessions.length === 0 ? (
          <div className="px-4 py-8 text-center text-[12.5px] text-[#8E8E8E] flex flex-col items-center gap-2">
            <MessageSquare className="w-5 h-5 text-neutral-300" />
            <span>No conversations yet.</span>
          </div>
        ) : (
          sessions.map((s) => {
            const isActive = activeId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s.id)}
                className={cn(
                  "block w-full text-left px-3.5 py-3 transition-colors cursor-pointer relative group",
                  isActive
                    ? "bg-[#FAFAF9] font-bold text-[#0A0A0A]"
                    : "hover:bg-[#FAFAF9] text-[#404040]",
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-orange-500" />
                )}
                <p className="text-[13px] truncate leading-tight group-hover:text-orange-600 transition-colors">
                  {s.title}
                </p>
                <p className="text-[11px] text-[#8E8E8E] mt-1 font-medium">
                  {relativeTime(s.lastActiveAt)}
                </p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

