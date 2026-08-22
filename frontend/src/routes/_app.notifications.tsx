/** Notification centre — filter by category, mark read, clear. */
import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/lib/components/layout";
import { Badge, Button, Card, EmptyState, Spinner } from "@/lib/components/ui";
import { essApi } from "@/lib/api/ess";
import { relativeTime } from "@/lib/utils/format";
import { NOTIFICATION_CATEGORY_LABELS, type AppNotification, type NotificationCategory } from "@/lib/types/ess";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/notifications")({
  component: NotificationsPage,
  head: () => ({
    meta: [
      { title: "Notifications — HRMS" },
      { name: "description", content: "Every leave, attendance, payroll and helpdesk update in one place." },
      { property: "og:title", content: "Notifications — HRMS" },
      { property: "og:description", content: "Every leave, attendance, payroll and helpdesk update in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const FILTERS: ("all" | "unread" | NotificationCategory)[] = [
  "all", "unread", "leave", "attendance", "payroll", "performance", "helpdesk", "expense", "announcement",
];

function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  useEffect(() => {
    void essApi.listNotifications().then((r) => {
      setItems(r.data ?? []);
      setLoading(false);
    });
  }, []);

  const shown = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "unread") return items.filter((n) => !n.read);
    return items.filter((n) => n.category === filter);
  }, [items, filter]);

  const unread = items.filter((n) => !n.read).length;

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={unread > 0 ? `${unread} unread update${unread > 1 ? "s" : ""}` : "You're all caught up."}
        actions={
          unread > 0 ? (
            <Button variant="secondary" onClick={() => void essApi.markAllRead().then((r) => setItems(r.data ?? []))}>
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
              filter === f ? "border-transparent text-white" : "border-[#E5E5E3] text-[#3F3F46] hover:bg-[#FAFAF8]",
            )}
            style={filter === f ? { background: "var(--tenant-primary)" } : undefined}
          >
            {f === "all" ? "All" : f === "unread" ? "Unread" : NOTIFICATION_CATEGORY_LABELS[f]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState title="Nothing here" subtitle="No notifications match this filter." />
      ) : (
        <Card padded={false} className="p-0 overflow-hidden">
          <ul>
            {shown.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "px-5 py-4 border-b border-[#F2F2F0] last:border-0 flex items-start gap-3",
                  !n.read && "bg-[#FAFAF8]",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="default">{NOTIFICATION_CATEGORY_LABELS[n.category]}</Badge>
                    {!n.read && <Badge variant="warning">New</Badge>}
                    <span className="text-[12px] text-[#9CA3AF]">{relativeTime(n.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 text-[14px] font-medium text-[#0A0A0A]">{n.title}</p>
                  <p className="text-[13px] text-[#6B6B6B] mt-0.5">{n.body}</p>
                  {n.actionTo && (
                    <Link
                      to={n.actionTo}
                      onClick={() => void essApi.markRead(n.id).then((r) => setItems(r.data ?? []))}
                      className="inline-block mt-2 text-[13px] font-medium"
                      style={{ color: "var(--tenant-primary)" }}
                    >
                      {n.actionLabel ?? "Open"}
                    </Link>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {!n.read && (
                    <Button size="sm" variant="ghost" onClick={() => void essApi.markRead(n.id).then((r) => setItems(r.data ?? []))}>
                      Mark read
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => void essApi.clearNotification(n.id).then((r) => setItems(r.data ?? []))}>
                    Clear
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}