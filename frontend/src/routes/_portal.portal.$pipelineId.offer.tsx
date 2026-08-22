/** Phase E stub — offer letter signing not yet implemented. */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, Badge } from "@/lib/components/ui";
import { CANDIDATE_STATUS_LABELS } from "@/lib/types/candidate";
import type { HiringPipeline } from "@/lib/types/candidate";
import { getPortalSession, getPipelineById } from "@/lib/utils/localStorage";

export const Route = createFileRoute("/_portal/portal/$pipelineId/offer")({
  head: () => ({ meta: [{ title: "Your Offer" }] }),
  component: OfferStubPage,
});

function OfferStubPage() {
  const { pipelineId } = Route.useParams();
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState<HiringPipeline | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getPortalSession();
    if (!session || session.pipelineId !== pipelineId) {
      navigate({ to: "/portal", search: { expired: "true" } });
      return;
    }
    setPipeline(getPipelineById(pipelineId));
    setReady(true);
  }, [pipelineId, navigate]);

  if (!ready) return null;

  return (
    <Card className="text-center py-12">
      {pipeline ? <Badge variant="tenant-accent">{CANDIDATE_STATUS_LABELS[pipeline.status]}</Badge> : null}
      <h1 className="mt-4 text-[16px] font-semibold text-[#0A0A0A]">Offer letter signing will be available in a future update.</h1>
    </Card>
  );
}
