/** Three-panel form builder: FieldPalette | BuilderCanvas | FieldEditor (or form settings). */
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Alert, Badge, Button, Input, Select, Spinner, Textarea, Toggle } from "@/lib/components/ui";
import { showToast } from "@/lib/components/ui/Toast";
import { PermissionGuard } from "@/lib/components/rbac/PermissionGuard";
import { formsApi, makeField } from "@/lib/api/forms";
import { countFields } from "@/lib/api/forms";
import {
  FORM_CATEGORY_LABELS,
  type FieldType,
  type FormCategory,
  type FormField,
  type FormSchema,
  type FormStatus,
} from "@/lib/types/formSchema";
import { FieldEditor } from "./FieldEditor";
import { FieldPalette } from "./FieldPalette";
import { BuilderCanvas } from "./BuilderCanvas";
import { StepManager } from "./StepManager";
import { FormPublishConfirm } from "./FormPublishConfirm";

const CATEGORY_OPTIONS = Object.entries(FORM_CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

const STATUS_BADGE: Record<FormStatus, { label: string; variant: "default" | "success" | "warning" }> = {
  draft: { label: "Draft", variant: "default" },
  published: { label: "Published", variant: "success" },
  archived: { label: "Archived", variant: "warning" },
};

export function FormBuilder({ initial }: { initial: FormSchema }) {
  const navigate = useNavigate();
  const [schema, setSchema] = useState<FormSchema>(initial);
  const [wasPublished] = useState(initial.status === "published");
  const [activeStepId, setActiveStepId] = useState(initial.steps[0]?.id ?? "");
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  const activeStep = useMemo(
    () => schema.steps.find((s) => s.id === activeStepId) ?? schema.steps[0],
    [schema, activeStepId],
  );
  const selectedField = useMemo(
    () => activeStep?.fields.find((f) => f.id === selectedFieldId) ?? null,
    [activeStep, selectedFieldId],
  );

  const patchSchema = (patch: Partial<FormSchema>) => setSchema((s) => ({ ...s, ...patch }));

  const patchStepFields = (fields: FormField[]) => {
    setSchema((s) => ({
      ...s,
      steps: s.steps.map((step) => (step.id === activeStep?.id ? { ...step, fields } : step)),
    }));
  };

  const addField = (type: FieldType) => {
    if (!activeStep) return;
    const field = makeField(type, activeStep.fields.length);
    patchStepFields([...activeStep.fields, field]);
    setSelectedFieldId(field.id);
  };

  const updateField = (id: string, patch: Partial<FormField>) => {
    if (!activeStep) return;
    patchStepFields(activeStep.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const duplicateField = (id: string) => {
    if (!activeStep) return;
    const idx = activeStep.fields.findIndex((f) => f.id === id);
    if (idx === -1) return;
    const copy: FormField = { ...structuredClone(activeStep.fields[idx]), id: `${id}_copy_${Date.now().toString(36)}` };
    const next = [...activeStep.fields];
    next.splice(idx + 1, 0, copy);
    patchStepFields(next.map((f, i) => ({ ...f, displayOrder: i })));
  };

  const deleteField = (id: string) => {
    if (!activeStep) return;
    patchStepFields(activeStep.fields.filter((f) => f.id !== id).map((f, i) => ({ ...f, displayOrder: i })));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const save = async () => {
    setSaving(true);
    const res = await formsApi.save(schema);
    setSaving(false);
    if (res.error) {
      showToast(res.error.message, "error");
      return;
    }
    if (res.data) {
      setSchema(res.data);
      showToast("Form saved.", "success");
    }
  };

  const publish = async () => {
    const saveRes = await formsApi.save(schema);
    if (saveRes.error || !saveRes.data) {
      showToast(saveRes.error?.message ?? "Could not save form.", "error");
      return;
    }
    const res = await formsApi.publish(saveRes.data.id);
    if (res.error) {
      showToast(res.error.message, "error");
      return;
    }
    if (res.data) {
      setSchema(res.data);
      showToast("Form published.", "success");
    }
  };

  return (
    <div className="flex h-full flex-col">
      {wasPublished && schema.status !== "archived" && (
        <Alert variant="warning" className="mb-4">
          This form is published. Editing will create a new draft version that must be republished.
        </Alert>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-[#E5E5E3] bg-white p-4">
        <Input
          value={schema.title}
          onChange={(e) => patchSchema({ title: e.target.value })}
          className="max-w-xs"
          aria-label="Form title"
        />
        <Select
          options={CATEGORY_OPTIONS}
          value={schema.category}
          onChange={(e) => patchSchema({ category: e.target.value as FormCategory })}
          className="w-52"
          aria-label="Form category"
        />
        <Badge variant={STATUS_BADGE[schema.status].variant}>{STATUS_BADGE[schema.status].label}</Badge>
        <span className="text-[12px] text-[#6B6B6B]">v{schema.version}</span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate({ to: "/settings/forms/$formId/preview", params: { formId: schema.id } })}
          >
            Preview
          </Button>
          <Button variant="secondary" onClick={save} loading={saving}>Save</Button>
          <PermissionGuard permission={["forms.create", "forms.manage_all"]}>
            <Button onClick={() => setPublishOpen(true)}>Publish</Button>
          </PermissionGuard>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        <FieldPalette onAdd={addField} />

        <div className="flex-1 overflow-y-auto rounded-lg border border-[#E5E5E3] bg-[#FAFAF8] p-4">
          {schema.steps.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {schema.steps.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveStepId(s.id)}
                  className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                    s.id === activeStep?.id ? "bg-[#0A0A0A] text-white" : "bg-white border border-[#E5E5E3] text-[#6B6B6B]"
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>
          )}
          {activeStep && (
            <BuilderCanvas
              step={activeStep}
              selectedFieldId={selectedFieldId}
              onSelectField={setSelectedFieldId}
              onReorder={patchStepFields}
              onDuplicate={duplicateField}
              onDelete={deleteField}
            />
          )}
        </div>

        <div className="w-80 shrink-0 overflow-y-auto rounded-lg border border-[#E5E5E3] bg-white p-4">
          {selectedField ? (
            <FieldEditor field={selectedField} schema={schema} onChange={(patch) => updateField(selectedField.id, patch)} />
          ) : (
            <div className="space-y-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Form settings</p>
              <Textarea label="Description" rows={3} value={schema.description ?? ""} onChange={(e) => patchSchema({ description: e.target.value })} />
              <StepManager schema={schema} activeStepId={activeStepId} onSelectStep={setActiveStepId} onChange={patchSchema} />
              <div className="space-y-3 border-t border-[#E5E5E3] pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#0A0A0A]">Allow draft saving</span>
                  <Toggle
                    checked={schema.settings.allowDraftSaving}
                    onChange={(v) => patchSchema({ settings: { ...schema.settings, allowDraftSaving: v } })}
                    size="sm"
                    label="Allow draft saving"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#0A0A0A]">Show progress bar</span>
                  <Toggle
                    checked={schema.settings.showProgressBar}
                    onChange={(v) => patchSchema({ settings: { ...schema.settings, showProgressBar: v } })}
                    size="sm"
                    label="Show progress bar"
                  />
                </div>
                <Input
                  label="Submit button label"
                  value={schema.settings.submitButtonLabel}
                  onChange={(e) => patchSchema({ settings: { ...schema.settings, submitButtonLabel: e.target.value } })}
                />
                <Textarea
                  label="Success message"
                  rows={2}
                  value={schema.settings.successMessage}
                  onChange={(e) => patchSchema({ settings: { ...schema.settings, successMessage: e.target.value } })}
                />
              </div>
              <p className="text-[12px] text-[#6B6B6B]">{countFields(schema)} field{countFields(schema) === 1 ? "" : "s"} total.</p>
            </div>
          )}
        </div>
      </div>

      {saving && <div className="sr-only"><Spinner size={16} /></div>}

      <FormPublishConfirm schema={schema} open={publishOpen} onOpenChange={setPublishOpen} onConfirm={publish} />
    </div>
  );
}
