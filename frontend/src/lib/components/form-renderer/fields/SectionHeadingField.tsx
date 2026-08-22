import type { FieldComponentProps } from "./types";

export function SectionHeadingField({ field }: FieldComponentProps) {
  return (
    <div>
      <h3 className="text-[17px] font-semibold text-[#0A0A0A]">{field.label}</h3>
      {field.helpText && <p className="mt-1 text-[13px] text-[#6B6B6B]">{field.helpText}</p>}
    </div>
  );
}
