/** Drag-drop + click logo uploader. Stores as data-URL for Phase 1. */
import { useRef, useState, type DragEvent } from "react";
import { cn } from "@/lib/utils";

export interface LogoUploadProps {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  className?: string;
}

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/svg+xml"];

export function LogoUpload({ value, onChange, className }: LogoUploadProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setError(null);
    if (!ALLOWED.includes(file.type)) return setError("PNG, JPG, or SVG only.");
    if (file.size > MAX_BYTES) return setError("Max file size is 2MB.");
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className={className}>
      <p className="mb-1.5 text-[13px] font-medium text-[#0A0A0A]">Company logo</p>
      <div
        onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && ref.current?.click()}
        className={cn(
          "flex items-center gap-4 rounded-md border-2 border-dashed p-4 cursor-pointer",
          "transition-colors duration-150 ease-out motion-reduce:transition-none",
          drag ? "border-[#F97316] bg-[#F97316]/5" : "border-[#E5E5E3] hover:border-[#0A0A0A]",
        )}
      >
        {value ? (
          <img src={value} alt="Uploaded logo" className="h-14 w-14 rounded-sm object-cover bg-[#F2F2F0]" />
        ) : (
          <div className="h-14 w-14 rounded-sm bg-[#F2F2F0] flex items-center justify-center text-[#6B6B6B] text-[11px] uppercase tracking-[0.08em]">Logo</div>
        )}
        <div className="flex-1">
          <p className="text-[14px] text-[#0A0A0A] font-medium">
            {value ? "Replace logo" : "Drag a file here or click to upload"}
          </p>
          <p className="text-[13px] text-[#6B6B6B]">PNG, SVG or JPG. Max 2MB.</p>
        </div>
        {value && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(undefined); }}
            className="text-[13px] text-[#6B6B6B] hover:text-[#DC2626] transition-colors"
          >
            Remove
          </button>
        )}
        <input
          ref={ref}
          type="file"
          accept={ALLOWED.join(",")}
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>
      {error && <p aria-live="polite" className="mt-1.5 text-[13px] text-[#DC2626]">{error}</p>}
    </div>
  );
}