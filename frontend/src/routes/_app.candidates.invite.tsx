import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Breadcrumb, Button, Card } from "@/lib/components/ui";
import { InviteForm, type InviteSuccess } from "@/lib/components/candidates";
import { PermissionGuard } from "@/lib/components/rbac";

export const Route = createFileRoute("/_app/candidates/invite")({
  component: InviteCandidatePage,
  head: () => ({ meta: [{ title: "Invite Candidate — HRMS" }] }),
});

function InviteCandidatePage() {
  const [result, setResult] = useState<InviteSuccess | null>(null);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.magicLinkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <PermissionGuard
      permission="employees.create"
      fallback={<p className="text-[14px] text-[#6B6B6B]">You don't have permission to invite candidates.</p>}
    >
      <div className="space-y-6 max-w-2xl">
        <Breadcrumb items={[{ label: "Candidates", to: "/candidates" }, { label: "Invite" }]} />
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">Invite candidate</h1>

        {result ? (
          <Card className="space-y-4">
            <div className="flex flex-col items-center text-center py-4">
              <span className="h-12 w-12 rounded-full bg-[#DCFCE7] text-[#166534] inline-flex items-center justify-center text-2xl">✓</span>
              <p className="mt-3 text-[16px] font-semibold text-[#0A0A0A]">Invitation sent to {result.email}</p>
              <Link
                to="/candidates/$candidateId"
      search={{ tab: "overview" as const }}
                params={{ candidateId: result.candidateId }}
                className="mt-2 text-[13px] text-[var(--tenant-primary)] hover:underline"
              >
                View candidate →
              </Link>
            </div>

            {import.meta.env.DEV && (
              <div className="rounded-md border border-[#E5E5E3] bg-[#FAFAF8] p-4 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Dev only — magic link</p>
                <p className="text-[13px] break-all text-[#0A0A0A]">{result.magicLinkUrl}</p>
                <p className="text-[12px] text-[#9CA3AF]">Expires {new Date(result.expiresAt).toLocaleString()}</p>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="secondary" onClick={copyLink}>{copied ? "Copied!" : "Copy"}</Button>
                  <a href={result.magicLinkUrl} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="secondary">Open portal</Button>
                  </a>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setResult(null)}>Invite another</Button>
            </div>
          </Card>
        ) : (
          <InviteForm onSuccess={setResult} />
        )}
      </div>
    </PermissionGuard>
  );
}
