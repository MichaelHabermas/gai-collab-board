import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
  query,
  orderBy,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { IComment, ICreateCommentParams } from '@/types';

const COMMENTS_SUBCOLLECTION = 'comments';

/**
 * Gets the reference to the comments subcollection for a board.
 */
const getCommentsCollection = (boardId: string) => {
  return collection(firestore, 'boards', boardId, COMMENTS_SUBCOLLECTION);
};

/**
 * Gets a reference to a specific comment document.
 */
const getCommentRef = (boardId: string, commentId: string) => {
  return doc(firestore, 'boards', boardId, COMMENTS_SUBCOLLECTION, commentId);
};

/**
 * Creates a new comment on a board object.
 */
export const createComment = async (
  boardId: string,
  params: ICreateCommentParams
): Promise<IComment> => {
  const commentsRef = getCommentsCollection(boardId);
  const commentRef = doc(commentsRef);
  const now = Timestamp.now();

  const comment: IComment = {
    id: commentRef.id,
    objectId: params.objectId,
    authorId: params.authorId,
    text: params.text,
    createdAt: now,
    updatedAt: now,
  };

  if (params.authorDisplayName) {
    comment.authorDisplayName = params.authorDisplayName;
  }

  if (params.parentId) {
    comment.parentId = params.parentId;
  }

  await setDoc(commentRef, comment);
  return comment;
};

/**
 * Deletes a comment from a board.
 */
export const deleteComment = async (boardId: string, commentId: string): Promise<void> => {
  const commentRef = getCommentRef(boardId, commentId);
  await deleteDoc(commentRef);
};

/**
 * Subscribes to real-time updates for all comments on a board.
 * Returns an unsubscribe function.
 */
export const subscribeToComments = (
  boardId: string,
  callback: (comments: IComment[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const commentsRef = getCommentsCollection(boardId);
  const commentsQuery = query(commentsRef, orderBy('createdAt', 'asc'));

  return onSnapshot(
    commentsQuery,
    (snapshot) => {
      const comments: IComment[] = [];
      snapshot.forEach((snapshotDoc) => {
        comments.push(snapshotDoc.data() as IComment);
      });
      callback(comments);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
};
