/** One internal HR comment, with inline edit for the author. */
import { useEffect, useRef, useState } from "react";
import { Avatar, Button, Textarea } from "@/lib/components/ui";
import type { PipelineComment } from "@/lib/types/candidate";

export interface CommentBubbleProps {
  comment: PipelineComment;
  currentUserId: string;
  onEdit: (comment: PipelineComment, content: string) => void;
  onDelete: (comment: PipelineComment) => void;
}

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

export function CommentBubble({ comment, currentUserId, onEdit, onDelete }: CommentBubbleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const isAuthor = comment.authorId === currentUserId;

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const save = () => {
    if (!draft.trim()) { setError("Comment cannot be empty"); return; }
    setError(null);
    onEdit(comment, draft);
    setEditing(false);
  };

  return (
    <div className="group rounded-md border border-[#E5E5E3] bg-white p-4">
      <div className="flex items-start gap-3">
        <Avatar name={comment.authorName} size={32} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[13px] font-semibold text-[#0A0A0A]">{comment.authorName}</p>
            <span className="text-[12px] text-[#9CA3AF]">{relative(comment.createdAt)}</span>
            {comment.isEdited && <span className="text-[12px] text-[#9CA3AF]">(edited)</span>}
            {isAuthor && !editing && (
              <span className="ml-auto flex gap-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button type="button" className="text-[12px] text-[#6B6B6B] hover:underline" onClick={() => { setDraft(comment.content); setEditing(true); }}>
                  Edit
                </button>
                <button type="button" className="text-[12px] text-[#DC2626] hover:underline" onClick={() => onDelete(comment)}>
                  Delete
                </button>
              </span>
            )}
          </div>
          {editing ? (
            <div className="mt-2 space-y-2">
              <Textarea ref={ref} value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} error={error ?? undefined} />
              <div className="flex gap-2">
                <Button size="sm" onClick={save}>Save</Button>
                <Button size="sm" variant="secondary" onClick={() => { setEditing(false); setError(null); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-[13px] text-[#0A0A0A] whitespace-pre-wrap break-words">{comment.content}</p>
          )}
        </div>
      </div>
    </div>
  );
}
