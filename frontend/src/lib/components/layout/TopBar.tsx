import { Menu, Search } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { NotificationBell } from "../ess/NotificationBell";
import { AiTopBarButton } from "../ai/AiTopBarButton";
import { usePermission } from "@/lib/hooks/usePermission";
import { uiStore } from "@/lib/store/ui";

export interface TopBarProps {
  userName: string;
  companyName: string;
  roleLabel?: string;
  onLogout: () => void;
  onMenu?: () => void;
}

export function TopBar({ userName, companyName, roleLabel, onLogout, onMenu }: TopBarProps) {
  const canChat = usePermission("ai.chat");
  return (
    <header className="h-16 shrink-0 border-b border-[#E5E5E3] bg-white px-3 sm:px-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {onMenu && (
          <button
            type="button"
            onClick={onMenu}
            aria-label="Open navigation"
            className="md:hidden -ml-1 p-2 rounded-md text-[#0A0A0A] hover:bg-[#F2F2F0] active:scale-95 transition"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium text-[#0A0A0A]">{companyName}</p>
          {roleLabel && <p className="truncate text-[11px] text-[#6B6B6B]">{roleLabel}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-3">
        <button
          type="button"
          onClick={() => uiStore.openSearch()}
          aria-label="Search"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] text-[#6B6B6B] bg-[#F9F9F7] border border-[#E5E5E3] hover:bg-[#F2F2F0] hover:text-[#0A0A0A] transition-colors"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden md:inline-block text-[10px] font-mono bg-white border border-[#E5E5E3] px-1.5 py-0.5 rounded text-[#6B6B6B]">⌘K</kbd>
        </button>
        {canChat && <AiTopBarButton />}
        <NotificationBell />
        <Avatar name={userName} size={32} />
        <span className="text-[14px] text-[#0A0A0A] hidden lg:inline truncate max-w-[140px]">{userName}</span>
        <Button variant="ghost" size="sm" onClick={onLogout}>Sign out</Button>
      </div>
    </header>
  );
}
