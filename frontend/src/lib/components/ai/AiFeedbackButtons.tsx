/** Thumbs up / down feedback on an assistant message. Thumbs-down reveals a small note field. */
import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import type { AiFeedbackValue } from "@/lib/types/ai";
import { cn } from "@/lib/utils";

export interface AiFeedbackButtonsProps {
  value: AiFeedbackValue | undefined;
  onChange: (value: AiFeedbackValue) => void;
  onNote?: (note: string) => void;
}

export function AiFeedbackButtons({ value, onChange, onNote }: AiFeedbackButtonsProps) {
  const [note, setNote] = useState("");
  const showNote = value === "not_helpful";

  return (
    <div className="mt-2.5 pt-1.5 flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Helpful"
          aria-pressed={value === "helpful"}
          onClick={() => onChange(value === "helpful" ? null : "helpful")}
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
            value === "helpful"
              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
              : "text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100",
          )}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          aria-label="Not helpful"
          aria-pressed={value === "not_helpful"}
          onClick={() => onChange(value === "not_helpful" ? null : "not_helpful")}
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
            value === "not_helpful"
              ? "bg-rose-50 text-rose-600 border border-rose-200"
              : "text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100",
          )}
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
      </div>
      {showNote && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note.trim() && onNote?.(note.trim())}
          placeholder="What went wrong? (optional)"
          rows={2}
          className="mt-1 w-full max-w-xs rounded-xl border border-[#E5E5E3] bg-[#FAFAF9] focus:bg-white p-2 text-[12px] text-[#0A0A0A] placeholder:text-neutral-400 outline-hidden focus:border-[#0A0A0A]"
        />
      )}
    </div>
  );
}

