import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Badge, Breadcrumb, Button, Card, ConfirmDialog, EmptyState, Spinner } from "@/lib/components/ui";
import { showToast } from "@/lib/components/ui/Toast";
import { SectionLabel } from "@/lib/components/layout/SectionLabel";
import { PermissionGuard } from "@/lib/components/rbac/PermissionGuard";
import { countFields, formsApi, submissionCount } from "@/lib/api/forms";
import { FORM_CATEGORY_LABELS, type FormCategory, type FormSchema, type FormStatus } from "@/lib/types/formSchema";

export const Route = createFileRoute("/_app/settings/forms/")({
  component: FormLibraryPage,
  head: () => ({ meta: [{ title: "Form Library — Settings — HRMS" }] }),
});

const CATEGORY_ORDER: FormCategory[] = ["candidate_onboarding", "employee_onboarding", "custom"];

const STATUS_BADGE: Record<FormStatus, { label: string; variant: "default" | "success" | "warning" }> = {
  draft: { label: "Draft", variant: "default" },
  published: { label: "Published", variant: "success" },
  archived: { label: "Archived", variant: "warning" },
};

function FormLibraryCard({
  form,
  onEdit,
  onPreview,
  onSubmissions,
  onDuplicate,
  onDelete,
}: {
  form: FormSchema;
  onEdit: () => void;
  onPreview: () => void;
  onSubmissions: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const status = STATUS_BADGE[form.status];
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-[#0A0A0A]">{form.title}</h3>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#6B6B6B]">
        <span>v{form.version}</span>
        <span>{countFields(form)} fields</span>
        <span>{submissionCount(form.id)} submissions</span>
        <span>Updated {new Date(form.updatedAt).toLocaleDateString()}</span>
      </div>
      <div className="mt-auto flex flex-wrap gap-2 pt-2 border-t border-[#F2F2F0]">
        <Button size="sm" variant="secondary" onClick={onEdit}>Edit</Button>
        <Button size="sm" variant="ghost" onClick={onPreview}>Preview</Button>
        <Button size="sm" variant="ghost" onClick={onSubmissions}>Submissions</Button>
        <Button size="sm" variant="ghost" onClick={onDuplicate}>Duplicate</Button>
        <PermissionGuard permission={["forms.create", "forms.manage_all"]}>
          <Button size="sm" variant="ghost" onClick={onDelete}>
            {form.status === "archived" ? "Archived" : "Archive"}
          </Button>
        </PermissionGuard>
      </div>
    </Card>
  );
}

function FormLibraryPage() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<FormSchema | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await formsApi.list();
    if (res.data) setForms(res.data);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const createForm = async () => {
    const res = await formsApi.create();
    if (res.error || !res.data) {
      showToast(res.error?.message ?? "Could not create form.", "error");
      return;
    }
    await navigate({ to: "/settings/forms/$formId", params: { formId: res.data.id } });
  };

  const duplicate = async (id: string) => {
    const res = await formsApi.duplicate(id);
    if (res.error) {
      showToast(res.error.message, "error");
      return;
    }
    showToast("Form duplicated.", "success");
    await load();
  };

  const remove = async () => {
    if (!deleteTarget) return;
    const res = await formsApi.remove(deleteTarget.id);
    if (res.data?.archived) showToast("Form has submissions — archived instead of deleted.", "info");
    else showToast("Form deleted.", "success");
    await load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Settings", to: "/settings/company" }, { label: "Forms" }]} />
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#0A0A0A]">Form Library</h1>
          <p className="text-[13px] text-[#6B6B6B] mt-1">Build and manage onboarding and custom forms.</p>
        </div>
        <PermissionGuard permission={["forms.create", "forms.manage_all"]}>
          <Button onClick={createForm}>+ Create form</Button>
        </PermissionGuard>
      </div>

      {forms.length === 0 ? (
        <EmptyState
          title="No forms yet."
          subtitle="Create your first form to start collecting structured information."
          action={<Button onClick={createForm}>Create form</Button>}
        />
      ) : (
        CATEGORY_ORDER.map((category, i) => {
          const inCategory = forms.filter((f) => f.category === category);
          if (inCategory.length === 0) return null;
          return (
            <div key={category} className="space-y-3">
              <SectionLabel number={String(i + 1).padStart(2, "0")} label={`${FORM_CATEGORY_LABELS[category].toUpperCase()} FORMS`} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inCategory.map((form) => (
                  <FormLibraryCard
                    key={form.id}
                    form={form}
                    onEdit={() => navigate({ to: "/settings/forms/$formId", params: { formId: form.id } })}
                    onPreview={() => navigate({ to: "/settings/forms/$formId/preview", params: { formId: form.id } })}
                    onSubmissions={() => navigate({ to: "/settings/forms/$formId/submissions", params: { formId: form.id } })}
                    onDuplicate={() => duplicate(form.id)}
                    onDelete={() => setDeleteTarget(form)}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Archive or delete this form?"
        description={
          deleteTarget && submissionCount(deleteTarget.id) > 0
            ? `"${deleteTarget.title}" has submissions and will be archived instead of deleted.`
            : `Delete "${deleteTarget?.title}"? This cannot be undone.`
        }
        confirmLabel={deleteTarget && submissionCount(deleteTarget.id) > 0 ? "Archive" : "Delete"}
        variant="danger"
        onConfirm={remove}
      />
    </div>
  );
}
