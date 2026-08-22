/** Candidate portal dashboard — status-specific content + step list. */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, Button, Badge } from "@/lib/components/ui";
import { PortalStepList } from "@/lib/components/portal";
import type { Candidate, HiringPipeline, CandidateSubmission } from "@/lib/types/candidate";
import {
  getPortalSession,
  getPipelineById,
  getCandidateById,
  getDraftSavedAt,
  getSubmissionsForPipeline,
} from "@/lib/utils/localStorage";

export const Route = createFileRoute("/_portal/portal/$pipelineId/")({
  head: () => ({ meta: [{ title: "Your Application" }] }),
  component: PortalDashboard,
});

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function PortalDashboard() {
  const { pipelineId } = Route.useParams();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pipeline, setPipeline] = useState<HiringPipeline | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<CandidateSubmission[]>([]);

  useEffect(() => {
    const session = getPortalSession();
    if (!session || session.pipelineId !== pipelineId) {
      navigate({ to: "/portal", search: { expired: "true" } });
      return;
    }
    const p = getPipelineById(pipelineId);
    if (!p) {
      navigate({ to: "/portal", search: { expired: "true" } });
      return;
    }
    setPipeline(p);
    setCandidate(getCandidateById(p.candidateId));
    setDraftSavedAt(getDraftSavedAt(pipelineId));
    setSubmissions(getSubmissionsForPipeline(pipelineId));
    setReady(true);
  }, [pipelineId, navigate]);

  if (!ready || !pipeline) return null;

  const latestSubmission = submissions[submissions.length - 1] ?? null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8">
      <aside className="flex flex-col gap-4">
        <div>
          <h1 className="text-[18px] font-semibold text-[#0A0A0A]">
            Welcome back, {candidate?.firstName ?? "there"}.
          </h1>
          {pipeline.roleName ? (
            <p className="text-[13px] text-[#6B6B6B] mt-1">{pipeline.roleName}</p>
          ) : null}
        </div>
        <Card padded={false} className="p-4">
          <PortalStepList pipelineId={pipeline.id} status={pipeline.status} />
        </Card>
      </aside>

      <main>
        {(pipeline.status === "portal_opened" || pipeline.status === "form_in_progress") && (
          <Card>
            <h2 className="text-[16px] font-semibold text-[#0A0A0A]">Continue your application</h2>
            <p className="mt-2 text-[14px] text-[#6B6B6B]">
              Fill in your details so we can move your application forward.
            </p>
            {draftSavedAt ? (
              <p className="mt-3 text-[12px] text-[#9CA3AF]">
                Resume where you left off — last saved {formatDateTime(draftSavedAt)}
              </p>
            ) : null}
            <div className="mt-5">
              <Button variant="tenant" onClick={() => navigate({ to: "/portal/$pipelineId/form", params: { pipelineId } })}>
                Start form
              </Button>
            </div>
          </Card>
        )}

        {pipeline.status === "submitted" && (
          <div className="flex flex-col gap-4">
            <Card className="border-[#BBF7D0] bg-[#F0FDF4]">
              <Badge variant="success">Submitted</Badge>
              <h2 className="mt-3 text-[16px] font-semibold text-[#0A0A0A]">
                Thanks — your application has been submitted!
              </h2>
              <p className="mt-2 text-[14px] text-[#166534]">
                Our team is reviewing your application. We'll be in touch soon.
              </p>
            </Card>
            {latestSubmission ? (
              <Card>
                <h3 className="text-[14px] font-semibold text-[#0A0A0A] mb-3">Your submission</h3>
                <dl className="grid grid-cols-1 gap-2 text-[13px]">
                  {Object.entries(latestSubmission.responses).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-4 border-b border-[#F2F2F0] py-1.5">
                      <dt className="text-[#6B6B6B]">{key}</dt>
                      <dd className="text-[#0A0A0A] text-right break-words">{String(value ?? "—")}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            ) : null}
          </div>
        )}

        {(pipeline.status === "changes_requested" || pipeline.status === "resubmitting") && (
          <Card className="border-[#FDE68A] bg-[#FFFBEB]">
            <Badge variant="warning">Changes needed</Badge>
            <h2 className="mt-3 text-[16px] font-semibold text-[#0A0A0A]">Update your application</h2>
            <p className="mt-2 text-[14px] text-[#92400E]">
              {pipeline.changeRequestNote || "HR has requested changes to your application."}
            </p>
            <div className="mt-5">
              <Button variant="tenant" onClick={() => navigate({ to: "/portal/$pipelineId/form", params: { pipelineId } })}>
                Update your application
              </Button>
            </div>
          </Card>
        )}

        {pipeline.status === "approved" && (
          <Card className="border-[#99F6E4] bg-[#F0FDFA]">
            <Badge variant="success">Approved</Badge>
            <h2 className="mt-3 text-[16px] font-semibold text-[#0A0A0A]">Congratulations!</h2>
            <p className="mt-2 text-[14px] text-[#0F766E]">
              Your application has been approved. We'll send your offer letter shortly.
            </p>
          </Card>
        )}

        {(pipeline.status === "offer_pending" || pipeline.status === "offer_sent") && (
          <Card>
            <h2 className="text-[16px] font-semibold text-[#0A0A0A]">Your offer is ready</h2>
            <p className="mt-2 text-[14px] text-[#6B6B6B]">
              Review the details of your offer and let us know your decision.
            </p>
            <div className="mt-5">
              <Button variant="tenant" onClick={() => navigate({ to: "/portal/$pipelineId/offer", params: { pipelineId } })}>
                View offer
              </Button>
            </div>
          </Card>
        )}

        {(pipeline.status === "candidate_signed" ||
          pipeline.status === "countersigned" ||
          pipeline.status === "onboarding") && (
          <Card>
            <h2 className="text-[16px] font-semibold text-[#0A0A0A]">Offer signed</h2>
            <p className="mt-2 text-[14px] text-[#6B6B6B]">
              We're getting things ready for your first day. Check back for onboarding updates.
            </p>
          </Card>
        )}

        {pipeline.status === "converted" && (
          <Card>
            <h2 className="text-[16px] font-semibold text-[#0A0A0A]">Welcome to the team!</h2>
            <p className="mt-2 text-[14px] text-[#6B6B6B]">
              You're officially onboard. Your HR team will reach out with next steps.
            </p>
          </Card>
        )}

        {(pipeline.status === "rejected" || pipeline.status === "withdrawn" || pipeline.status === "offer_rejected") && (
          <Card>
            <h2 className="text-[16px] font-semibold text-[#0A0A0A]">This application is closed</h2>
            <p className="mt-2 text-[14px] text-[#6B6B6B]">
              There is no further action needed at this time.
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
