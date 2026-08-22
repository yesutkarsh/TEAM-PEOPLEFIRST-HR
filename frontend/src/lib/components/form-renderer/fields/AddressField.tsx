import { Input, Select } from "@/lib/components/ui";
import type { AddressComponent } from "@/lib/types/formSchema";
import type { FieldComponentProps } from "./types";

const COMPONENT_LABELS: Record<AddressComponent, string> = {
  line1: "Address line 1",
  line2: "Address line 2",
  city: "City",
  state: "State",
  pincode: "Pincode",
  country: "Country",
};

export function AddressField({ field, value, onChange, disabled }: FieldComponentProps) {
  const address = (value as Record<string, string>) ?? {};
  const components = field.addressComponents?.length
    ? field.addressComponents
    : (["line1", "line2", "city", "state", "pincode", "country"] as AddressComponent[]);

  const setPart = (key: AddressComponent, v: string) => {
    onChange({ ...address, [key]: v });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {components.map((c) => (
        <div key={c} className={c === "line1" || c === "line2" ? "sm:col-span-2" : undefined}>
          <label className="mb-1.5 block text-[13px] font-medium text-[#0A0A0A]">{COMPONENT_LABELS[c]}</label>
          {c === "country" ? (
            <Select
              value={address.country ?? ""}
              disabled={disabled}
              placeholder="Select country"
              options={[
                { value: "IN", label: "India" },
                { value: "US", label: "United States" },
                { value: "GB", label: "United Kingdom" },
                { value: "AE", label: "United Arab Emirates" },
                { value: "SG", label: "Singapore" },
              ]}
              onChange={(e) => setPart("country", e.target.value)}
            />
          ) : (
            <Input
              value={address[c] ?? ""}
              disabled={disabled}
              onChange={(e) => setPart(c, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
