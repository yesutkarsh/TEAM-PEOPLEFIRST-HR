import { Badge, Card } from "@/lib/components/ui";
import { relativeTime } from "@/lib/utils/format";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type HelpdeskTicket,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/types/ess";

const statusVariant: Record<TicketStatus, "default" | "warning" | "success"> = {
  open: "warning",
  in_progress: "warning",
  resolved: "success",
  closed: "default",
};

const priorityVariant: Record<TicketPriority, "default" | "warning" | "danger"> = {
  low: "default",
  medium: "default",
  high: "warning",
  urgent: "danger",
};

export interface TicketCardProps {
  ticket: HelpdeskTicket;
  onOpen?: () => void;
}

export function TicketCard({ ticket, onOpen }: TicketCardProps) {
  return (
    <Card padded={false} className="p-0">
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left p-5 hover:bg-[#FAFAF8] transition-colors rounded-md"
      >
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-[12px] font-mono text-[#6B6B6B]">{ticket.code}</span>
          <Badge variant={statusVariant[ticket.status]}>{TICKET_STATUS_LABELS[ticket.status]}</Badge>
          <Badge variant={priorityVariant[ticket.priority]}>{TICKET_PRIORITY_LABELS[ticket.priority]}</Badge>
          <span className="text-[12px] text-[#6B6B6B] ml-auto">Updated {relativeTime(ticket.updatedAt)}</span>
        </div>
        <h3 className="text-[15px] font-semibold text-[#0A0A0A]">{ticket.subject}</h3>
        <p className="mt-1 text-[13px] text-[#6B6B6B] line-clamp-2">{ticket.description}</p>
        <p className="mt-2 text-[12px] text-[#6B6B6B]">
          {TICKET_CATEGORY_LABELS[ticket.category]}
          {ticket.assignedTo ? ` · Assigned to ${ticket.assignedTo}` : " · Unassigned"}
          {ticket.comments.length > 0 ? ` · ${ticket.comments.length} update${ticket.comments.length > 1 ? "s" : ""}` : ""}
        </p>
      </button>
    </Card>
  );
}