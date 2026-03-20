import { useState, useEffect, useCallback } from "react";
import {
  getComments,
  postComment as postCommentService,
  getCommentCounts,
} from "../lib/commentService";
import type { Comment } from "../lib/types";

type UseCommentsResult = {
  comments: Comment[];
  postComment: (userId: string, displayName: string, text: string) => Promise<void>;
  commentCount: number;
  loading: boolean;
};

export function useComments(activityId: string): UseCommentsResult {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadComments = useCallback(async () => {
    if (!activityId) {
      setLoading(false);
      return;
    }

    try {
      const [fetched, counts] = await Promise.all([
        getComments(activityId),
        getCommentCounts([activityId]),
      ]);
      setComments(fetched);
      setCommentCount(counts[activityId] ?? 0);
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const postComment = useCallback(
    async (userId: string, displayName: string, text: string) => {
      await postCommentService(activityId, userId, displayName, text);
      await loadComments();
    },
    [activityId, loadComments]
  );

  return { comments, postComment, commentCount, loading };
}
