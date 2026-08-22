import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Spinner } from "@/lib/components/ui";
import { showToast } from "@/lib/components/ui/Toast";
import { formsApi } from "@/lib/api/forms";

export const Route = createFileRoute("/_app/settings/forms/new")({
  component: NewFormPage,
  head: () => ({ meta: [{ title: "New Form — Settings — HRMS" }] }),
});

function NewFormPage() {
  const navigate = useNavigate();
  useEffect(() => {
    void (async () => {
      const res = await formsApi.create();
      if (res.error || !res.data) {
        showToast(res.error?.message ?? "Could not create form.", "error");
        await navigate({ to: "/settings/forms" });
        return;
      }
      await navigate({ to: "/settings/forms/$formId", params: { formId: res.data.id } });
    })();
  }, [navigate]);

  return (
    <div className="flex justify-center py-16">
      <Spinner size={24} />
    </div>
  );
}
