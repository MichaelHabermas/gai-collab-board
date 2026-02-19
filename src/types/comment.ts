import { Timestamp } from 'firebase/firestore';

/** A comment on a board object. */
export interface IComment {
  id: string;
  objectId: string;
  authorId: string;
  authorDisplayName?: string;
  text: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** Parent comment ID for threaded replies. Undefined for top-level comments. */
  parentId?: string;
}

/** Parameters for creating a new comment. */
export interface ICreateCommentParams {
  objectId: string;
  authorId: string;
  authorDisplayName?: string;
  text: string;
  parentId?: string;
}
