/** Raise a new helpdesk ticket. */
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/lib/components/layout";
import { Alert, Button, Card, FileUpload, Input, RadioGroup, Select, Textarea, showToast } from "@/lib/components/ui";
import { essApi } from "@/lib/api/ess";
import { authStore } from "@/lib/store/auth";
import { useCurrentEmployee } from "@/lib/hooks/useCurrentEmployee";
import { TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS, type TicketCategory, type TicketPriority } from "@/lib/types/ess";

export const Route = createFileRoute("/_app/helpdesk/new")({
  component: NewTicketPage,
  head: () => ({
    meta: [
      { title: "Raise a Ticket — HRMS" },
      { name: "description", content: "Submit an IT, HR, payroll or facilities support request." },
      { property: "og:title", content: "Raise a Ticket — HRMS" },
      { property: "og:description", content: "Submit an IT, HR, payroll or facilities support request." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function NewTicketPage() {
  const navigate = useNavigate();
  const user = authStore.useSelector((s) => s.user);
  const { employee } = useCurrentEmployee();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory>("it");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [file, setFile] = useState<{ name: string; sizeKB: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res = await essApi.createTicket({
      subject,
      description,
      category,
      priority,
      raisedByEmployeeId: employee?.id ?? "",
      raisedByName: user?.fullName ?? "You",
      attachmentName: file?.name,
    });
    setBusy(false);
    if (res.error) return setError(res.error.message);
    showToast(`Ticket ${res.data?.code} created.`, "success");
    navigate({ to: "/helpdesk" });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Raise a ticket" description="Tell us what you need and we'll route it to the right team." />
      {error && <Alert variant="error" title="Could not submit">{error}</Alert>}
      <Card className="space-y-5">
        <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short summary of the issue" />
        <Select
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as TicketCategory)}
          options={(Object.keys(TICKET_CATEGORY_LABELS) as TicketCategory[]).map((c) => ({ value: c, label: TICKET_CATEGORY_LABELS[c] }))}
        />
        <div>
          <p className="text-[13px] font-medium mb-2">Priority</p>
          <RadioGroup
            orientation="horizontal"
            value={priority}
            onChange={(v) => setPriority(v as TicketPriority)}
            options={(Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map((p) => ({ value: p, label: TICKET_PRIORITY_LABELS[p] }))}
          />
        </div>
        <Textarea
          label="Description"
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          hint="Include steps, dates and anything the team needs to reproduce or verify."
        />
        <FileUpload
          label="Attachment (optional)"
          currentFile={file}
          onFileSelect={(f) => setFile({ name: f.name, sizeKB: Math.round(f.size / 1024) })}
          onFileRemove={() => setFile(null)}
        />
        <div className="flex gap-2 pt-1">
          <Button variant="primary" loading={busy} onClick={() => void submit()}>Submit ticket</Button>
          <Button variant="ghost" onClick={() => navigate({ to: "/helpdesk" })}>Cancel</Button>
        </div>
      </Card>
    </div>
  );
}