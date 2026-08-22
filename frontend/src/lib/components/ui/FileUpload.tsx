/** Drag-drop file upload with preview and validation. */
import { useRef, useState, type DragEvent } from "react";
import { cn } from "@/lib/utils";

export interface FileUploadProps {
  label?: string;
  accept?: string;
  maxSizeMB?: number;
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  currentFile?: { name: string; sizeKB: number } | null;
  error?: string;
  className?: string;
}

export function FileUpload({
  label,
  accept = ".pdf,.jpg,.jpeg,.png",
  maxSizeMB = 5,
  onFileSelect,
  onFileRemove,
  currentFile,
  error,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localErr, setLocalErr] = useState<string | undefined>(undefined);

  const validate = (f: File): string | null => {
    const allowed = accept.split(",").map((a) => a.trim().toLowerCase().replace(".", ""));
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowed.includes(ext)) return `Only ${accept} files accepted`;
    if (f.size > maxSizeMB * 1024 * 1024) return `File exceeds ${maxSizeMB}MB limit`;
    return null;
  };
  const handle = (file: File) => {
    const err = validate(file);
    if (err) { setLocalErr(err); return; }
    setLocalErr(undefined);
    onFileSelect(file);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handle(f);
  };
  const shownError = error ?? localErr;

  return (
    <div className={cn("w-full", className)}>
      {label && <label className="mb-1.5 block text-[13px] font-medium text-[#0A0A0A]">{label}</label>}
      {currentFile ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-[#E5E5E3] bg-[#FAFAF8] px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <span aria-hidden className="text-[#16A34A]">✓</span>
            <span className="text-[13px] truncate text-[#0A0A0A]">{currentFile.name}</span>
            <span className="text-[12px] text-[#6B6B6B] shrink-0">{currentFile.sizeKB} KB</span>
          </div>
          {onFileRemove && (
            <button type="button" onClick={onFileRemove} className="text-[12px] text-[#DC2626] hover:underline">
              Remove
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "w-full rounded-md border-2 border-dashed px-4 py-6 text-[13px] text-[#6B6B6B] transition-colors",
            dragging ? "border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/5" : "border-[#E5E5E3] bg-white hover:bg-[#FAFAF8]",
            shownError && "border-[#DC2626]",
          )}
        >
          Drag a file here or click to browse
          <p className="mt-1 text-[11px] text-[#9CA3AF]">{accept} · max {maxSizeMB}MB</p>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f);
          e.target.value = "";
        }}
      />
      {shownError && <p className="mt-1.5 text-[13px] text-[#DC2626]">{shownError}</p>}
    </div>
  );
}