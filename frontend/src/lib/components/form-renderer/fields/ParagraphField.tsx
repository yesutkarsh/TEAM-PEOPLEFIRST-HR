import type { FieldComponentProps } from "./types";

export function ParagraphField({ field }: FieldComponentProps) {
  return <p className="text-[14px] leading-relaxed text-[#3F3F3F] whitespace-pre-wrap">{field.label}</p>;
}
