/** Header notification bell with unread badge and dropdown panel. Client-only rendering to avoid hydration mismatch. */
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { essApi } from "@/lib/api/ess";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/utils/format";
import type { AppNotification } from "@/lib/types/ess";

export function NotificationBell() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    void essApi.listNotifications().then((r) => setItems(r.data ?? []));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!mounted) return <div className="w-9 h-9" aria-hidden />;

  const unread = items.filter((n) => !n.read).length;

  const markAll = async () => {
    const res = await essApi.markAllRead();
    setItems(res.data ?? []);
  };
  const markOne = async (id: string) => {
    const res = await essApi.markRead(id);
    setItems(res.data ?? []);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
      >
        <Bell className="h-[18px] w-[18px] text-[#0A0A0A]" aria-hidden />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-semibold text-white flex items-center justify-center"
            style={{ background: "#DC2626" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-md border border-[#E5E5E3] bg-white shadow-lg z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E3]">
            <p className="text-[14px] font-semibold">Notifications</p>
            {unread > 0 && (
              <button onClick={() => void markAll()} className="text-[12px] text-[#6B6B6B] hover:text-[#0A0A0A]">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-[#6B6B6B]">You're all caught up.</p>
            ) : (
              items.slice(0, 8).map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "px-4 py-3 border-b border-[#F2F2F0] last:border-0 hover:bg-[#FAFAF8] transition-colors",
                    !n.read && "bg-[#FAFAF8]",
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span aria-hidden className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--tenant-primary)" }} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium truncate">{n.title}</p>
                      <p className="text-[12px] text-[#6B6B6B] mt-0.5 line-clamp-2">{n.body}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] text-[#9CA3AF]">{relativeTime(n.createdAt)}</span>
                        {n.actionTo && (
                          <Link
                            to={n.actionTo}
                            onClick={() => { void markOne(n.id); setOpen(false); }}
                            className="text-[11px] font-medium"
                            style={{ color: "var(--tenant-primary)" }}
                          >
                            {n.actionLabel ?? "Open"}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-center text-[13px] font-medium border-t border-[#E5E5E3] hover:bg-[#FAFAF8] transition-colors"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}