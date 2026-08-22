/** Candidate application form — renders FormRenderer against the pipeline's form schema. */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, Spinner } from "@/lib/components/ui";
import { FormRenderer } from "@/lib/components/form-renderer";
import type { FormSchema } from "@/lib/types/formSchema";
import type { HiringPipeline } from "@/lib/types/candidate";
import { portalApi } from "@/lib/api/candidates";
import { uiStore } from "@/lib/store/ui";
import {
  getPortalSession,
  getPipelineById,
  getLocalFormByVersionId,
  getLocalFormById,
  getDraft,
  saveDraft,
  getSubmissionsForPipeline,
} from "@/lib/utils/localStorage";

export const Route = createFileRoute("/_portal/portal/$pipelineId/form")({
  head: () => ({ meta: [{ title: "Application Form" }] }),
  component: PortalFormPage,
});

function PortalFormPage() {
  const { pipelineId } = Route.useParams();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pipeline, setPipeline] = useState<HiringPipeline | null>(null);
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [initialValues, setInitialValues] = useState<Record<string, unknown>>({});
  const [readOnlyValues, setReadOnlyValues] = useState<Record<string, unknown> | null>(null);

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

    const form = (p.formVersionId && getLocalFormByVersionId(p.formVersionId)) ||
      (p.formId && getLocalFormById(p.formId)) || null;
    setSchema(form);

    if (p.status === "submitted") {
      const subs = getSubmissionsForPipeline(pipelineId);
      const last = subs[subs.length - 1];
      setReadOnlyValues(last?.responses ?? {});
    } else {
      const draft = getDraft(pipelineId);
      if (draft) {
        setInitialValues(draft);
      } else if (p.status === "changes_requested") {
        const subs = getSubmissionsForPipeline(pipelineId);
        const last = subs[subs.length - 1];
        setInitialValues(last?.responses ?? {});
      }
      portalApi.markFormStarted(pipelineId);
    }
    setReady(true);
  }, [pipelineId, navigate]);

  if (!ready) return null;

  if (!schema) {
    return (
      <Card className="text-center py-12">
        <h1 className="text-[16px] font-semibold text-[#0A0A0A]">Form not available</h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">
          There isn't an application form configured yet. Please contact HR.
        </p>
      </Card>
    );
  }

  if (!pipeline) return <Spinner size={24} />;

  if (readOnlyValues) {
    return (
      <FormRenderer
        schema={schema}
        initialValues={readOnlyValues}
        onSubmit={async () => {}}
        readOnly
        isPreview={false}
      />
    );
  }

  const banner =
    pipeline.status === "changes_requested" && pipeline.changeRequestNote ? (
      <div className="mb-6 rounded-md border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-[13px] text-[#92400E]">
        {pipeline.changeRequestNote}
      </div>
    ) : undefined;

  return (
    <FormRenderer
      schema={schema}
      initialValues={initialValues}
      onDraftSave={(values) => saveDraft(pipelineId, values)}
      onSubmit={async (values) => {
        const res = await portalApi.submit(pipelineId, values);
        if (res.data) {
          uiStore.pushToast({ message: "Your application has been submitted.", variant: "success" });
          navigate({ to: "/portal/$pipelineId", params: { pipelineId } });
        } else {
          uiStore.pushToast({ message: res.error?.message ?? "Something went wrong.", variant: "error" });
        }
      }}
      banner={banner}
    />
  );
}
