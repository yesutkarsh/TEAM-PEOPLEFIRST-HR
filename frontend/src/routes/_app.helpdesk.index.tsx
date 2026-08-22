/** Helpdesk — my tickets, filters, detail slide-over with comment thread. */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/lib/components/layout";
import { Badge, Button, EmptyState, SlideOver, Spinner, Textarea, showToast } from "@/lib/components/ui";
import { TicketCard } from "@/lib/components/ess";
import { essApi } from "@/lib/api/ess";
import { authStore } from "@/lib/store/auth";
import { formatDate, relativeTime } from "@/lib/utils/format";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type HelpdeskTicket,
  type TicketStatus,
} from "@/lib/types/ess";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/helpdesk/")({
  component: HelpdeskPage,
  head: () => ({
    meta: [
      { title: "Helpdesk — HRMS" },
      { name: "description", content: "Raise and track IT, HR, payroll and facilities support tickets." },
      { property: "og:title", content: "Helpdesk — HRMS" },
      { property: "og:description", content: "Raise and track IT, HR, payroll and facilities support tickets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const STATUSES: ("all" | TicketStatus)[] = ["all", "open", "in_progress", "resolved", "closed"];

function HelpdeskPage() {
  const navigate = useNavigate();
  const user = authStore.useSelector((s) => s.user);
  const [tickets, setTickets] = useState<HelpdeskTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const [openTicket, setOpenTicket] = useState<HelpdeskTicket | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = () => {
    void essApi.listTickets().then((r) => {
      setTickets(r.data ?? []);
      setLoading(false);
    });
  };
  useEffect(reload, []);

  const shown = useMemo(
    () => (status === "all" ? tickets : tickets.filter((t) => t.status === status)),
    [tickets, status],
  );

  const postReply = async () => {
    if (!openTicket || !reply.trim()) return;
    setBusy(true);
    const res = await essApi.addTicketComment(openTicket.id, { author: user?.fullName ?? "You", message: reply.trim() });
    setBusy(false);
    if (res.error) return showToast(res.error.message, "error");
    setReply("");
    setOpenTicket(res.data ?? null);
    reload();
    showToast("Reply added.", "success");
  };

  const close = async () => {
    if (!openTicket) return;
    const res = await essApi.closeTicket(openTicket.id);
    if (res.error) return showToast(res.error.message, "error");
    setOpenTicket(res.data ?? null);
    reload();
    showToast("Ticket closed.", "info");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Helpdesk"
        description="Raise a request and follow it through to resolution."
        actions={<Button variant="primary" onClick={() => navigate({ to: "/helpdesk/new" })}>Raise a ticket</Button>}
      />

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
              status === s ? "border-transparent text-white" : "border-[#E5E5E3] text-[#3F3F46] hover:bg-[#FAFAF8]",
            )}
            style={status === s ? { background: "var(--tenant-primary)" } : undefined}
          >
            {s === "all" ? "All" : TICKET_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={28} /></div>
      ) : shown.length === 0 ? (
        <EmptyState
          title="No tickets here"
          subtitle="Raise a ticket and the support team will pick it up."
          action={<Button variant="primary" onClick={() => navigate({ to: "/helpdesk/new" })}>Raise a ticket</Button>}
        />
      ) : (
        <div className="space-y-3 max-w-3xl">
          {shown.map((t) => <TicketCard key={t.id} ticket={t} onOpen={() => setOpenTicket(t)} />)}
        </div>
      )}

      <SlideOver
        open={openTicket !== null}
        onClose={() => setOpenTicket(null)}
        title={openTicket?.subject ?? "Ticket"}
        description={openTicket ? `${openTicket.code} · raised ${formatDate(openTicket.createdAt)}` : undefined}
        width="lg"
        footer={
          openTicket && openTicket.status !== "closed" ? (
            <div className="flex gap-2">
              <Button variant="primary" loading={busy} onClick={() => void postReply()} disabled={!reply.trim()}>
                Post reply
              </Button>
              <Button variant="ghost" onClick={() => void close()}>Close ticket</Button>
            </div>
          ) : undefined
        }
      >
        {openTicket && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">{TICKET_CATEGORY_LABELS[openTicket.category]}</Badge>
              <Badge variant="warning">{TICKET_PRIORITY_LABELS[openTicket.priority]}</Badge>
              <Badge variant="default">{TICKET_STATUS_LABELS[openTicket.status]}</Badge>
            </div>
            <p className="text-[14px] leading-relaxed text-[#3F3F46]">{openTicket.description}</p>
            {openTicket.attachmentName && (
              <p className="text-[12px] text-[#6B6B6B]">Attachment: {openTicket.attachmentName}</p>
            )}
            <div>
              <h3 className="text-[13px] font-semibold mb-2">Updates</h3>
              {openTicket.comments.length === 0 ? (
                <p className="text-[13px] text-[#6B6B6B]">No updates yet.</p>
              ) : (
                <ul className="space-y-3">
                  {openTicket.comments.map((c) => (
                    <li key={c.id} className="rounded-md border border-[#E5E5E3] px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium">{c.author}</span>
                        <span className="text-[11px] text-[#9CA3AF]">{relativeTime(c.at)}</span>
                      </div>
                      <p className="text-[13px] text-[#3F3F46] mt-1">{c.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {openTicket.status !== "closed" && (
              <Textarea
                label="Add a reply"
                rows={4}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Share more detail or respond to the support team…"
              />
            )}
          </div>
        )}
      </SlideOver>
    </div>
  );
}