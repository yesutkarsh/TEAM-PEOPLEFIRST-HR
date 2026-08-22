/** Internal HR discussion thread for a hiring pipeline. */
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog, EmptyState, showToast } from "@/lib/components/ui";
import { reviewApi } from "@/lib/api/candidates";
import type { PipelineComment } from "@/lib/types/candidate";
import { CommentBubble } from "./CommentBubble";
import { CommentInput } from "./CommentInput";

export interface PipelineCommentsProps {
  pipelineId: string;
  currentUserId: string;
  currentUserName: string;
  onCountChange?: (count: number) => void;
}

export function PipelineComments({ pipelineId, currentUserId, currentUserName, onCountChange }: PipelineCommentsProps) {
  const [comments, setComments] = useState<PipelineComment[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<PipelineComment | null>(null);

  const load = useCallback(() => {
    const list = reviewApi.comments(pipelineId);
    setComments(list);
    onCountChange?.(list.length);
  }, [pipelineId, onCountChange]);

  useEffect(() => { load(); }, [load]);

  const actor = { id: currentUserId, name: currentUserName };

  const add = async (content: string) => {
    const r = await reviewApi.addComment(pipelineId, content, actor);
    if (r.error) { showToast(r.error.message, "error"); return; }
    load();
  };

  const edit = async (comment: PipelineComment, content: string) => {
    const r = await reviewApi.editComment(comment, content, actor);
    if (r.error) { showToast(r.error.message, "error"); return; }
    showToast("Comment updated.", "success");
    load();
  };

  const remove = async (comment: PipelineComment) => {
    await reviewApi.deleteComment(comment, actor);
    showToast("Comment deleted.", "success");
    load();
  };

  return (
    <div className="space-y-4 max-w-3xl">
      {comments.length === 0 ? (
        <EmptyState title="No comments yet" subtitle="Use comments to discuss this candidate with your team." />
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <CommentBubble key={c.id} comment={c} currentUserId={currentUserId} onEdit={edit} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}
      <CommentInput onSend={add} />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete this comment?"
        description="This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={async () => { if (deleteTarget) await remove(deleteTarget); }}
      />
    </div>
  );
}
