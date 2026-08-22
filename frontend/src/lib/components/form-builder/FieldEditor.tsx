/** Right panel: settings for the currently selected field. */
import { Checkbox, Input, Select, Textarea, Toggle } from "@/lib/components/ui";
import { NON_DATA_FIELD_TYPES, type AddressComponent, type FormField, type FormSchema } from "@/lib/types/formSchema";
import { ConditionBuilder } from "./ConditionBuilder";
import { OptionsEditor } from "./OptionsEditor";
import { RepeatableGroupEditor } from "./RepeatableGroupEditor";
import { ValidationRuleEditor } from "./ValidationRuleEditor";

const ADDRESS_COMPONENTS: { value: AddressComponent; label: string }[] = [
  { value: "line1", label: "Address line 1" },
  { value: "line2", label: "Address line 2" },
  { value: "city", label: "City" },
  { value: "state", label: "State" },
  { value: "pincode", label: "Pincode" },
  { value: "country", label: "Country" },
];

export function FieldEditor({
  field,
  schema,
  onChange,
}: {
  field: FormField;
  schema: FormSchema;
  onChange: (patch: Partial<FormField>) => void;
}) {
  const hasOptions = ["dropdown", "radio", "checkbox_group", "multi_select"].includes(field.type);
  const isDataField = !NON_DATA_FIELD_TYPES.includes(field.type);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B] mb-3">Field settings</p>
        <div className="space-y-3">
          <Input label="Label" value={field.label} onChange={(e) => onChange({ label: e.target.value })} />
          <Textarea label="Help text" rows={2} value={field.helpText ?? ""} onChange={(e) => onChange({ helpText: e.target.value })} />
          {isDataField && (
            <Input label="Placeholder" value={field.placeholder ?? ""} onChange={(e) => onChange({ placeholder: e.target.value })} />
          )}
        </div>
      </div>

      {isDataField && (
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-[#0A0A0A]">Required</span>
          <Toggle checked={field.required} onChange={(v) => onChange({ required: v })} size="sm" label="Required" />
        </div>
      )}

      {field.type === "long_text" && (
        <Input type="number" label="Rows" value={field.rows ?? 4} onChange={(e) => onChange({ rows: Number(e.target.value) || 1 })} />
      )}

      {hasOptions && (
        <OptionsEditor options={field.options ?? []} onChange={(options) => onChange({ options })} />
      )}

      {field.type === "file_upload" && (
        <div className="space-y-3">
          <Input type="number" label="Max files" value={field.maxFiles ?? 1} onChange={(e) => onChange({ maxFiles: Number(e.target.value) || 1 })} />
          <Input type="number" label="Max file size (MB)" value={field.maxFileSizeMB ?? 5} onChange={(e) => onChange({ maxFileSizeMB: Number(e.target.value) || 1 })} />
          <Input
            label="Accepted file types (comma separated)"
            value={(field.acceptedFileTypes ?? []).join(", ")}
            onChange={(e) => onChange({ acceptedFileTypes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
          />
        </div>
      )}

      {field.type === "address" && (
        <div>
          <p className="text-[13px] font-medium text-[#0A0A0A] mb-2">Address components</p>
          <div className="space-y-1.5">
            {ADDRESS_COMPONENTS.map((c) => {
              const checked = (field.addressComponents ?? []).includes(c.value);
              return (
                <Checkbox
                  key={c.value}
                  label={c.label}
                  checked={checked}
                  onChange={(e) => {
                    const current = field.addressComponents ?? [];
                    onChange({
                      addressComponents: e.target.checked
                        ? [...current, c.value]
                        : current.filter((v) => v !== c.value),
                    });
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {field.type === "date" && (
        <div className="grid grid-cols-2 gap-3">
          <Input type="text" label="Minimum date" placeholder="YYYY-MM-DD" value={field.minDate ?? ""} onChange={(e) => onChange({ minDate: e.target.value })} />
          <Input type="text" label="Maximum date" placeholder="YYYY-MM-DD" value={field.maxDate ?? ""} onChange={(e) => onChange({ maxDate: e.target.value })} />
        </div>
      )}

      {field.type === "repeatable_group" && (
        <RepeatableGroupEditor field={field} onChange={onChange} />
      )}

      {field.type === "signature" && (
        <Input label="Signature label" value={field.signatureLabel ?? ""} onChange={(e) => onChange({ signatureLabel: e.target.value })} />
      )}

      {isDataField && (
        <ValidationRuleEditor rules={field.validation} onChange={(validation) => onChange({ validation })} />
      )}

      {isDataField && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B] mb-3">Conditional logic</p>
          <ConditionBuilder field={field} schema={schema} onChange={(condition) => onChange({ condition })} />
        </div>
      )}
    </div>
  );
}
