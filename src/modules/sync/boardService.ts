import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  query,
  where,
  runTransaction,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { IBoard, UserRole } from '@/types';

const BOARDS_COLLECTION = 'boards';

const USER_BOARD_ROLES: UserRole[] = ['owner', 'editor', 'viewer'];

export interface ICreateBoardParams {
  id?: string; // Optional - use this ID instead of generating one
  name: string;
  ownerId: string;
  ownerEmail?: string;
}

export const createBoard = async (params: ICreateBoardParams): Promise<IBoard> => {
  const { id, name, ownerId } = params;
  // Use provided ID or generate a new one
  const boardRef = id
    ? doc(firestore, BOARDS_COLLECTION, id)
    : doc(collection(firestore, BOARDS_COLLECTION));
  const now = Timestamp.now();

  const board: IBoard = {
    id: boardRef.id,
    name,
    ownerId,
    members: {
      [ownerId]: 'owner',
    },
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(boardRef, board);
  return board;
};

export const getBoard = async (boardId: string): Promise<IBoard | null> => {
  const boardRef = doc(firestore, BOARDS_COLLECTION, boardId);
  const boardSnap = await getDoc(boardRef);

  if (!boardSnap.exists()) {
    return null;
  }

  return boardSnap.data() as IBoard;
};

export const subscribeToBoard = (
  boardId: string,
  callback: (board: IBoard | null) => void
): Unsubscribe => {
  const boardRef = doc(firestore, BOARDS_COLLECTION, boardId);
  return onSnapshot(boardRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as IBoard);
    } else {
      callback(null);
    }
  });
};

/**
 * Subscribe to all boards where the user is a member (owner, editor, or viewer).
 * Requires a Firestore composite index on (members.{userId}, updatedAt) if ordering is added later.
 */
export const subscribeToUserBoards = (
  userId: string,
  callback: (boards: IBoard[]) => void
): Unsubscribe => {
  const boardsRef = collection(firestore, BOARDS_COLLECTION);
  const memberPath = `members.${userId}`;
  const q = query(boardsRef, where(memberPath, 'in', USER_BOARD_ROLES));
  return onSnapshot(q, (snapshot) => {
    const byId = new Map<string, IBoard>();
    for (const d of snapshot.docs) {
      if (!byId.has(d.id)) {
        byId.set(d.id, { id: d.id, ...d.data() } as IBoard);
      }
    }
    callback(Array.from(byId.values()));
  });
};

export const updateBoardName = async (
  boardId: string,
  name: string,
  userId: string
): Promise<void> => {
  const boardRef = doc(firestore, BOARDS_COLLECTION, boardId);
  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(boardRef);
    if (!snap.exists()) throw new Error('Board not found');
    const board = snap.data() as IBoard;
    if (!canUserManage(board, userId)) {
      throw new Error('Only the board owner can rename the board');
    }
    tx.update(boardRef, { name, updatedAt: Timestamp.now() });
  });
};

export const addBoardMember = async (
  boardId: string,
  userId: string,
  role: UserRole
): Promise<void> => {
  const boardRef = doc(firestore, BOARDS_COLLECTION, boardId);
  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(boardRef);
    if (!snap.exists()) throw new Error('Board not found');
    const board = snap.data() as IBoard;
    const updatedMembers = { ...board.members, [userId]: role };
    tx.update(boardRef, { members: updatedMembers, updatedAt: Timestamp.now() });
  });
};

export const removeBoardMember = async (boardId: string, userId: string): Promise<void> => {
  const boardRef = doc(firestore, BOARDS_COLLECTION, boardId);
  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(boardRef);
    if (!snap.exists()) throw new Error('Board not found');
    const board = snap.data() as IBoard;
    if (board.ownerId === userId) {
      throw new Error('Cannot remove the owner from the board');
    }
    const remainingMembers = { ...board.members };
    delete remainingMembers[userId];
    tx.update(boardRef, { members: remainingMembers, updatedAt: Timestamp.now() });
  });
};

export const updateMemberRole = async (
  boardId: string,
  userId: string,
  role: UserRole
): Promise<void> => {
  const boardRef = doc(firestore, BOARDS_COLLECTION, boardId);
  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(boardRef);
    if (!snap.exists()) throw new Error('Board not found');
    const board = snap.data() as IBoard;
    if (board.ownerId === userId && role !== 'owner') {
      throw new Error("Cannot change the owner's role");
    }
    const updatedMembers = { ...board.members, [userId]: role };
    tx.update(boardRef, { members: updatedMembers, updatedAt: Timestamp.now() });
  });
};

export const deleteBoard = async (boardId: string, userId: string): Promise<void> => {
  const boardRef = doc(firestore, BOARDS_COLLECTION, boardId);
  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(boardRef);
    if (!snap.exists()) throw new Error('Board not found');
    const board = snap.data() as IBoard;
    if (!canUserManage(board, userId)) {
      throw new Error('Only the board owner can delete the board');
    }
    tx.delete(boardRef);
  });
};

export const getUserRole = (board: IBoard, userId: string): UserRole | null => {
  return board.members[userId] ?? null;
};

export const canUserEdit = (board: IBoard, userId: string): boolean => {
  const role = getUserRole(board, userId);
  return role === 'owner' || role === 'editor';
};

export const canUserManage = (board: IBoard, userId: string): boolean => {
  return board.ownerId === userId;
};
