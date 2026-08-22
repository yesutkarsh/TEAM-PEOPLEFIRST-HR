import { Badge, Button, Card } from "@/lib/components/ui";
import { formatDate } from "@/lib/utils/format";
import { ANNOUNCEMENT_CATEGORY_LABELS, type Announcement, type AnnouncementCategory } from "@/lib/types/ess";

const variantFor: Record<AnnouncementCategory, "default" | "success" | "warning" | "danger" | "tenant-accent"> = {
  general: "default",
  policy: "tenant-accent",
  event: "success",
  celebration: "success",
  urgent: "danger",
};

export interface AnnouncementCardProps {
  announcement: Announcement;
  onAcknowledge?: () => void;
}

export function AnnouncementCard({ announcement, onAcknowledge }: AnnouncementCardProps) {
  const a = announcement;
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={variantFor[a.category]}>{ANNOUNCEMENT_CATEGORY_LABELS[a.category]}</Badge>
        {a.pinned && <Badge variant="warning">Pinned</Badge>}
        <span className="text-[12px] text-[#6B6B6B] ml-auto">{formatDate(a.publishedAt)}</span>
      </div>
      <div>
        <h3 className="text-[16px] font-semibold text-[#0A0A0A]">{a.title}</h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-[#3F3F46]">{a.body}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#F2F2F0]">
        <p className="text-[12px] text-[#6B6B6B]">{a.author} · {a.audience}</p>
        {a.requiresAck && (
          a.acknowledged ? (
            <span className="text-[12px] font-medium text-[#15803D]">Acknowledged</span>
          ) : (
            <Button size="sm" variant="secondary" onClick={onAcknowledge}>Acknowledge</Button>
          )
        )}
      </div>
    </Card>
  );
}