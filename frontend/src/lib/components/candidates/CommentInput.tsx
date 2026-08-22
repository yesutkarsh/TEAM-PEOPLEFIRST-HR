/** Auto-growing internal comment composer. Cmd/Ctrl+Enter sends. */
import { useRef, useState, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/lib/components/ui";

export interface CommentInputProps {
  onSend: (content: string) => void | Promise<void>;
}

export function CommentInput({ onSend }: CommentInputProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  const grow = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const send = async () => {
    if (!value.trim()) { setError("Comment cannot be empty"); return; }
    setError(null);
    await onSend(value.trim());
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="rounded-md border border-[#E5E5E3] bg-white p-3">
      <textarea
        ref={ref}
        value={value}
        rows={2}
        onChange={(e) => { setValue(e.target.value); setError(null); grow(); }}
        onKeyDown={onKeyDown}
        placeholder="Add an internal comment — not visible to the candidate"
        className="w-full resize-none text-[13px] text-[#0A0A0A] placeholder:text-[#9CA3AF] outline-none"
      />
      {error && <p className="text-[12px] text-[#DC2626]">{error}</p>}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-[#9CA3AF]">Ctrl + Enter to send</span>
        <Button size="sm" trailingIcon={<Send size={14} />} onClick={() => void send()}>Comment</Button>
      </div>
    </div>
  );
}
