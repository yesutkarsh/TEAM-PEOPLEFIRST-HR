/**
 * BACKEND: files are stored as base64 data URLs in localStorage for this mock.
 * The real implementation requests a pre-signed R2 upload URL, PUTs the file
 * directly to object storage, and stores only the resulting object key here.
 */
import { FileUpload } from "@/lib/components/ui";
import type { FieldComponentProps } from "./types";

export interface StoredFile {
  name: string;
  sizeKB: number;
  dataUrl: string;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function FileUploadField({ field, value, onChange, error, disabled }: FieldComponentProps) {
  const files = Array.isArray(value) ? (value as StoredFile[]) : [];
  const maxFiles = field.maxFiles ?? 1;
  const accept = field.acceptedFileTypes?.length ? field.acceptedFileTypes.map((t) => `.${t}`).join(",") : undefined;

  const handleSelect = async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    const next: StoredFile = { name: file.name, sizeKB: Math.round(file.size / 1024), dataUrl };
    onChange(maxFiles === 1 ? [next] : [...files, next]);
  };
  const handleRemove = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      {files.map((f, idx) => (
        <div key={idx} className="flex items-center justify-between gap-3 rounded-md border border-[#E5E5E3] bg-[#FAFAF8] px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <span aria-hidden className="text-[#16A34A]">✓</span>
            <span className="text-[13px] truncate text-[#0A0A0A]">{f.name}</span>
            <span className="text-[12px] text-[#6B6B6B] shrink-0">{f.sizeKB} KB</span>
          </div>
          {!disabled && (
            <button type="button" onClick={() => handleRemove(idx)} className="text-[12px] text-[#DC2626] hover:underline">
              Remove
            </button>
          )}
        </div>
      ))}
      {!disabled && files.length < maxFiles && (
        <FileUpload
          accept={accept}
          maxSizeMB={field.maxFileSizeMB}
          onFileSelect={handleSelect}
          error={error}
        />
      )}
    </div>
  );
}
