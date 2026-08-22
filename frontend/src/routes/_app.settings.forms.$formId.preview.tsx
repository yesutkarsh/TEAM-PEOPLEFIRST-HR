import { useEffect, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Badge, Spinner } from "@/lib/components/ui";
import { showToast } from "@/lib/components/ui/Toast";
import { formsApi } from "@/lib/api/forms";
import { FormRenderer } from "@/lib/components/form-renderer";
import type { FormSchema } from "@/lib/types/formSchema";

export const Route = createFileRoute("/_app/settings/forms/$formId/preview")({
  component: FormPreviewPage,
  head: () => ({ meta: [{ title: "Preview Form — Settings — HRMS" }] }),
});

function FormPreviewPage() {
  const { formId } = useParams({ from: "/_app/settings/forms/$formId/preview" });
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const res = await formsApi.get(formId);
      if (res.error || !res.data) {
        showToast(res.error?.message ?? "Form not found.", "error");
      } else {
        setSchema(res.data);
      }
      setLoading(false);
    })();
  }, [formId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={24} />
      </div>
    );
  }

  if (!schema) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-4 py-8">
      <div className="flex items-center justify-between">
        <Link to="/settings/forms/$formId" params={{ formId }} className="text-[13px] text-[#6B6B6B] hover:text-[#0A0A0A]">
          ← Back to builder
        </Link>
        <Badge>Preview</Badge>
      </div>
      <FormRenderer
        schema={schema}
        isPreview
        onSubmit={() => showToast("This is a preview — responses are not saved.", "info")}
      />
    </div>
  );
}
