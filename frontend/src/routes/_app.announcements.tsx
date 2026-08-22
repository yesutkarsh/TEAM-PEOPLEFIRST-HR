/** Company announcements feed with category filtering and acknowledgement. */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/lib/components/layout";
import { EmptyState, SearchInput, Spinner, showToast } from "@/lib/components/ui";
import { AnnouncementCard } from "@/lib/components/ess";
import { essApi } from "@/lib/api/ess";
import { ANNOUNCEMENT_CATEGORY_LABELS, type Announcement, type AnnouncementCategory } from "@/lib/types/ess";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/announcements")({
  component: AnnouncementsPage,
  head: () => ({
    meta: [
      { title: "Announcements — HRMS" },
      { name: "description", content: "Company-wide news, policy updates and events for every employee." },
      { property: "og:title", content: "Announcements — HRMS" },
      { property: "og:description", content: "Company-wide news, policy updates and events for every employee." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const CATEGORIES: ("all" | AnnouncementCategory)[] = ["all", "general", "policy", "event", "celebration", "urgent"];

function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    void essApi.listAnnouncements().then((r) => {
      setItems(r.data ?? []);
      setLoading(false);
    });
  }, []);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter(
      (a) =>
        (category === "all" || a.category === category) &&
        (term === "" || a.title.toLowerCase().includes(term) || a.body.toLowerCase().includes(term)),
    );
  }, [items, category, q]);

  const acknowledge = async (id: string) => {
    const res = await essApi.acknowledgeAnnouncement(id);
    if (res.data) {
      setItems(res.data.slice().sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.publishedAt.localeCompare(a.publishedAt)));
      showToast("Acknowledged. Thanks!", "success");
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" description="News, policy changes and events from across the company." />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search announcements…" className="w-full sm:w-80" />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                category === c ? "border-transparent text-white" : "border-[#E5E5E3] text-[#3F3F46] hover:bg-[#FAFAF8]",
              )}
              style={category === c ? { background: "var(--tenant-primary)" } : undefined}
            >
              {c === "all" ? "All" : ANNOUNCEMENT_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState title="No announcements" subtitle="Nothing matches your search or filter." />
      ) : (
        <div className="space-y-4 max-w-3xl">
          {shown.map((a) => (
            <AnnouncementCard key={a.id} announcement={a} onAcknowledge={() => void acknowledge(a.id)} />
          ))}
        </div>
      )}
    </div>
  );
}