import { useState, useEffect, useCallback, useMemo } from 'react';
import type { IComment, ICreateCommentParams } from '@/types';
import {
  createComment as createCommentService,
  deleteComment as deleteCommentService,
  subscribeToComments,
} from '@/modules/sync/commentService';

interface UseCommentsParams {
  boardId: string | undefined;
}

interface UseCommentsResult {
  /** All comments for the board, ordered by createdAt. */
  comments: IComment[];
  /** Comments grouped by objectId for efficient lookup. */
  commentsByObjectId: Map<string, IComment[]>;
  /** Whether the initial load is in progress. */
  loading: boolean;
  /** Create a new comment. */
  createComment: (params: ICreateCommentParams) => Promise<IComment | null>;
  /** Delete a comment by ID (only author should call this). */
  deleteComment: (commentId: string) => Promise<void>;
  /** Error from the subscription, if any. */
  commentsError: Error | null;
}

/**
 * Hook for real-time comments on a board.
 * Subscribes to the comments subcollection and provides CRUD operations.
 */
export const useComments = ({ boardId }: UseCommentsParams): UseCommentsResult => {
  // Key by boardId so we never setState synchronously in the effect; only in the subscription callback.
  const [subscriptionData, setSubscriptionData] = useState<{
    boardId: string;
    comments: IComment[];
  } | null>(null);
  const [commentsError, setCommentsError] = useState<Error | null>(null);

  useEffect(() => {
    if (!boardId) return;

    const unsubscribe = subscribeToComments(
      boardId,
      (nextComments) => {
        setSubscriptionData({ boardId, comments: nextComments });
        setCommentsError(null);
      },
      (error) => {
        console.error('Comments subscription error:', error);
        setCommentsError(error);
      }
    );

    return () => unsubscribe();
  }, [boardId]);

  const effectiveComments = useMemo(
    () =>
      subscriptionData && subscriptionData.boardId === boardId ? subscriptionData.comments : [],
    [boardId, subscriptionData]
  );
  const effectiveLoading = Boolean(
    boardId && (!subscriptionData || subscriptionData.boardId !== boardId)
  );

  // Group comments by objectId
  const commentsByObjectId = useMemo(() => {
    const map = new Map<string, IComment[]>();
    for (const comment of effectiveComments) {
      const existing = map.get(comment.objectId);
      if (existing) {
        existing.push(comment);
      } else {
        map.set(comment.objectId, [comment]);
      }
    }
    return map;
  }, [effectiveComments]);

  const createComment = useCallback(
    async (params: ICreateCommentParams): Promise<IComment | null> => {
      if (!boardId) return null;

      return createCommentService(boardId, params);
    },
    [boardId]
  );

  const deleteComment = useCallback(
    async (commentId: string): Promise<void> => {
      if (!boardId) return;

      return deleteCommentService(boardId, commentId);
    },
    [boardId]
  );

  return {
    comments: effectiveComments,
    commentsByObjectId,
    loading: effectiveLoading,
    createComment,
    deleteComment,
    commentsError,
  };
};
