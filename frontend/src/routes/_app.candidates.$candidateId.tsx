import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { Breadcrumb, Card, EmptyState, Select, Spinner, Tabs, showToast } from "@/lib/components/ui";
import {
  CandidateScoring,
  CandidateStatusBadge,
  DocumentVault,
  HRReviewPanel,
  PipelineActivityLog,
  PipelineComments,
  PipelineTimeline,
  RejectionDialog,
  ReviewerAssignmentPanel,
  SubmissionHistory,
} from "@/lib/components/candidates";
import { authStore } from "@/lib/store/auth";
import { candidatesApi } from "@/lib/api/candidates";
import { formsApi } from "@/lib/api/forms";
import { Button } from "@/lib/components/ui";
import type { Candidate, CandidateSubmission, HiringPipeline } from "@/lib/types/candidate";
import type { FormSchema } from "@/lib/types/formSchema";
import { PermissionGuard } from "@/lib/components/rbac";

const TAB_IDS = ["overview", "submission", "documents", "comments", "activity"] as const;
type TabId = (typeof TAB_IDS)[number];

export const Route = createFileRoute("/_app/candidates/$candidateId")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: TAB_IDS.includes(search.tab as TabId) ? (search.tab as TabId) : "overview",
  }),
  component: CandidateDetailPage,
  head: () => ({ meta: [{ title: "Candidate — HRMS" }] }),
});

function CandidateDetailPage() {
  const { candidateId } = useParams({ from: "/_app/candidates/$candidateId" });
  const { tab } = useSearch({ from: "/_app/candidates/$candidateId" });
  const navigate = useNavigate({ from: "/_app/candidates/$candidateId" });
  const user = authStore.useSelector((s) => s.user);
  const [docCount, setDocCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [auditKey, setAuditKey] = useState(0);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [pipelines, setPipelines] = useState<HiringPipeline[]>([]);
  const [activePipelineId, setActivePipelineId] = useState<string>("");
  const [submissions, setSubmissions] = useState<CandidateSubmission[]>([]);
  const [form, setForm] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const r = await candidatesApi.get(candidateId);
    if (r.data) {
      setCandidate(r.data.candidate);
      setPipelines(r.data.pipelines);
      setActivePipelineId((prev) => prev || r.data!.pipelines[0]?.id || "");
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [candidateId]);

  const pipeline = pipelines.find((p) => p.id === activePipelineId) ?? null;

  useEffect(() => {
    if (!pipeline) {
      setSubmissions([]);
      setForm(null);
      return;
    }
    setSubmissions(candidatesApi.submissions(pipeline.id));
    if (pipeline.formId) {
      void formsApi.get(pipeline.formId).then((r) => setForm(r.data ?? null));
    } else {
      setForm(null);
    }
  }, [pipeline?.id]);

  const magicLink = pipeline ? candidatesApi.currentMagicLink(pipeline.id) : null;

  const resend = async () => {
    if (!pipeline) return;
    const r = await candidatesApi.resendInvitation(pipeline.id);
    if (r.data) {
      showToast(`New link: ${r.data.magicLinkUrl}`, "success");
      void load();
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
  }
  if (!candidate || !pipeline) {
    return <EmptyState title="Candidate not found" subtitle="They may have been removed." />;
  }

  const maskedLink = magicLink ? magicLink.url.replace(/token=([^&]{4}).+$/, "token=$1••••••") : null;

  const refreshAll = () => { setAuditKey((k) => k + 1); void load(); };

  const overviewTab = (
    <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-6">
      <div className="space-y-6">
        <PipelineTimeline events={pipeline.events} />
        <CandidateScoring pipelineId={pipeline.id} />
      </div>
      <div className="space-y-4">
        <Card>
          <h3 className="text-[13px] font-semibold text-[#0A0A0A] mb-3">Candidate info</h3>
          <dl className="space-y-2 text-[13px]">
            <Row label="Email" value={candidate.email} />
            <Row label="Phone" value={candidate.phone ?? "—"} />
            <Row label="Role" value={pipeline.roleName ?? "—"} />
            <Row label="Invited by" value={pipeline.invitedBy} />
            <Row label="Invited on" value={new Date(pipeline.invitedAt).toLocaleString()} />
            <Row label="Form used" value={form ? `${form.title} (v${form.version})` : "—"} />
            {pipeline.rejectionReasonLabel && <Row label="Rejection reason" value={pipeline.rejectionReasonLabel} />}
          </dl>
          {maskedLink && magicLink && (
            <div className="mt-4 pt-4 border-t border-[#E5E5E3] space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Magic link</p>
              <p className="text-[12px] break-all text-[#0A0A0A]">{maskedLink}</p>
              <p className="text-[12px] text-[#9CA3AF]">Expires {new Date(magicLink.expiresAt).toLocaleString()}</p>
              <Button size="sm" variant="secondary" className="mt-1" onClick={resend}>Resend</Button>
            </div>
          )}
        </Card>
        <ReviewerAssignmentPanel pipelineId={pipeline.id} onChanged={refreshAll} />
        <HRReviewPanel pipeline={pipeline} onChanged={refreshAll} />
      </div>
    </div>
  );

  return (
    <PermissionGuard
      permission="employees.view_profile"
      fallback={<p className="text-[14px] text-[#6B6B6B]">You don't have permission to view this candidate.</p>}
    >
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Candidates", to: "/candidates" }, { label: `${candidate.firstName} ${candidate.lastName}` }]} />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] font-bold tracking-[-0.02em]">{candidate.firstName} {candidate.lastName}</h1>
            <CandidateStatusBadge status={pipeline.status} />
          </div>
          <div className="flex items-center gap-2">
            {(pipeline.status === "invited" || pipeline.status === "expired") && (
              <Button variant="secondary" size="sm" onClick={resend}>Resend invitation</Button>
            )}
            {pipeline.status !== "rejected" && pipeline.status !== "converted" && pipeline.status !== "withdrawn" && (
              <PermissionGuard permission="employees.edit">
                <Button variant="danger" size="sm" onClick={() => setRejectOpen(true)}>Reject</Button>
              </PermissionGuard>
            )}
          </div>
        </div>

        {pipelines.length > 1 && (
          <Select
            label="Pipeline"
            value={activePipelineId}
            onChange={(e) => setActivePipelineId(e.target.value)}
            options={pipelines.map((p) => ({
              value: p.id,
              label: `${p.roleName ?? "Untitled role"} — invited ${new Date(p.invitedAt).toLocaleDateString()}`,
            }))}
          />
        )}

        <Tabs
          activeTab={tab}
          onTabChange={(id) => void navigate({ to: "/candidates/$candidateId", params: { candidateId }, search: { tab: id as TabId }, replace: true })}
          tabs={[
            { id: "overview", label: "Overview", content: overviewTab },
            { id: "submission", label: "Submission", content: <SubmissionHistory submissions={submissions} form={form} /> },
            {
              id: "documents",
              label: "Documents",
              badge: docCount || undefined,
              content: <DocumentVault pipelineId={pipeline.id} onCountChange={setDocCount} />,
            },
            {
              id: "comments",
              label: "Comments",
              badge: commentCount || undefined,
              content: (
                <PipelineComments
                  pipelineId={pipeline.id}
                  currentUserId={user?.id ?? "hr_admin"}
                  currentUserName={user?.fullName ?? "HR Admin"}
                  onCountChange={setCommentCount}
                />
              ),
            },
            { id: "activity", label: "Activity", content: <PipelineActivityLog pipelineId={pipeline.id} refreshKey={auditKey} /> },
          ]}
        />

        <RejectionDialog
          open={rejectOpen}
          onClose={() => setRejectOpen(false)}
          pipelineIds={[pipeline.id]}
          onDone={() => { showToast("Candidate rejected.", "success"); void load(); }}
        />
      </div>
    </PermissionGuard>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[#6B6B6B]">{label}</dt>
      <dd className="text-[#0A0A0A] text-right">{value}</dd>
    </div>
  );
}
