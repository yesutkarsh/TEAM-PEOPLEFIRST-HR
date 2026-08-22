export { Button } from "@/lib/components/ui";

export function SectionDivider({ label, hint }: { label: string; hint?: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">{label}</p>
      {hint && <p className="text-[12px] text-[#6B6B6B] mt-0.5">{hint}</p>}
    </div>
  );
}
