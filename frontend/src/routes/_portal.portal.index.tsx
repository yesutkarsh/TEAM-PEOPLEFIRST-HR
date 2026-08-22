/** Magic-link landing page — /portal?token=... */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Spinner, Card } from "@/lib/components/ui";
import { MagicLinkLanding } from "@/lib/components/portal";
import { portalApi } from "@/lib/api/candidates";

const searchSchema = z.object({
  token: z.string().optional(),
  expired: z.union([z.literal("true"), z.literal("false")]).optional(),
});

export const Route = createFileRoute("/_portal/portal/")({
  head: () => ({ meta: [{ title: "Candidate Portal — Sign In" }] }),
  validateSearch: searchSchema,
  component: MagicLinkPage,
});

type Status = "loading" | "success" | "expired" | "none";

function MagicLinkPage() {
  const { token, expired } = Route.useSearch();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>(token ? "loading" : "none");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    portalApi.authenticate(token).then((res) => {
      if (cancelled) return;
      if (res.data) {
        setStatus("success");
        navigate({ to: "/portal/$pipelineId", params: { pipelineId: res.data.pipelineId } });
      } else {
        setStatus("expired");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  if (status === "loading") {
    return (
      <MagicLinkLanding title="Verifying your access…">
        <Spinner size={28} className="text-[var(--tenant-primary)]" />
      </MagicLinkLanding>
    );
  }

  if (status === "expired") {
    return (
      <Card className="text-center py-12">
        <h1 className="text-[18px] font-semibold text-[#0A0A0A]">This invitation link has expired.</h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">Contact HR to request a new link.</p>
      </Card>
    );
  }

  if (expired === "true") {
    return (
      <Card className="text-center py-12">
        <h1 className="text-[18px] font-semibold text-[#0A0A0A]">Your session has expired.</h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">
          Please use your original invitation link to sign in again.
        </p>
      </Card>
    );
  }

  return (
    <Card className="text-center py-12">
      <h1 className="text-[18px] font-semibold text-[#0A0A0A]">Candidate Portal</h1>
      <p className="mt-2 text-[14px] text-[#6B6B6B]">
        Please use the invitation link sent to your email to access your application.
      </p>
    </Card>
  );
}
