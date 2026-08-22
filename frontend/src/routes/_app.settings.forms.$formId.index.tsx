import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Spinner } from "@/lib/components/ui";
import { showToast } from "@/lib/components/ui/Toast";
import { formsApi } from "@/lib/api/forms";
import { FormBuilder } from "@/lib/components/form-builder";
import type { FormSchema } from "@/lib/types/formSchema";

export const Route = createFileRoute("/_app/settings/forms/$formId/")({
  component: FormBuilderPage,
  head: () => ({ meta: [{ title: "Edit Form — Settings — HRMS" }] }),
});

function FormBuilderPage() {
  const { formId } = useParams({ from: "/_app/settings/forms/$formId/" });
  const navigate = useNavigate();
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const res = await formsApi.get(formId);
      if (res.error || !res.data) {
        showToast(res.error?.message ?? "Form not found.", "error");
        await navigate({ to: "/settings/forms" });
        return;
      }
      setSchema(res.data);
      setLoading(false);
    })();
  }, [formId, navigate]);

  if (loading || !schema) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)]">
      <FormBuilder key={schema.id} initial={schema} />
    </div>
  );
}
