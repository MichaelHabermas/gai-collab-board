import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  getUserRole,
  canUserEdit,
  canUserManage,
  deleteBoard,
  removeBoardMember,
  updateBoardName,
  createBoard,
  getBoard,
  addBoardMember,
  updateMemberRole,
  subscribeToBoard,
  subscribeToUserBoards,
} from '@/modules/sync/boardService';
import { IBoard } from '@/types';

// ── Transaction mock helpers ──────────────────────────────────────────
const mockTxUpdate = vi.fn();
const mockTxDelete = vi.fn();
const mockTxGet = vi.fn();

const mockRunTransaction = vi.fn(
  async (_db: unknown, cb: (tx: { get: typeof mockTxGet; update: typeof mockTxUpdate; delete: typeof mockTxDelete }) => Promise<void>) => {
    await cb({ get: mockTxGet, update: mockTxUpdate, delete: mockTxDelete });
  }
);

const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDoc = vi.fn();
const mockOnSnapshot = vi.fn();
const mockCollection = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();

let boardDocIdCounter = 0;

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => {
    mockCollection(...args);

    return { _collection: true };
  },
  doc: (...args: unknown[]) => {
    // doc(firestore, 'boards', id) or doc(collectionRef)
    const id = typeof args[2] === 'string' ? args[2] : `auto-id-${String(++boardDocIdCounter)}`;

    return { id, _ref: true };
  },
  getDoc: (ref: unknown) => mockGetDoc(ref),
  setDoc: (ref: unknown, data: unknown) => mockSetDoc(ref, data),
  onSnapshot: (refOrQuery: unknown, callback: unknown) => {
    mockOnSnapshot(refOrQuery, callback);

    return vi.fn(); // unsubscribe
  },
  query: (ref: unknown, ...constraints: unknown[]) => {
    mockQuery(ref, ...constraints);

    return { ref, constraints };
  },
  where: (field: string, op: string, value: unknown) => {
    mockWhere(field, op, value);

    return { field, op, value };
  },
  runTransaction: (...args: Parameters<typeof mockRunTransaction>) => mockRunTransaction(...args),
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 }),
  },
}));

vi.mock('@/lib/firebase', () => ({
  firestore: {},
}));

// ── Snapshot factory ──────────────────────────────────────────────────
const makeSnapshot = (board: IBoard | null) => ({
  exists: () => board != null,
  data: () => (board != null ? board : undefined),
});

// ── Test data ─────────────────────────────────────────────────────────
const mockBoard: IBoard = {
  id: 'board-123',
  name: 'Test Board',
  ownerId: 'owner-user',
  members: {
    'owner-user': 'owner',
    'editor-user': 'editor',
    'viewer-user': 'viewer',
  },
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
};

// ======================================================================
// Role helper functions (pure — no mocks needed)
// ======================================================================

describe('boardService - Role Functions', () => {
  describe('getUserRole', () => {
    it('should return owner role for owner', () => {
      expect(getUserRole(mockBoard, 'owner-user')).toBe('owner');
    });
    it('should return editor role for editor', () => {
      expect(getUserRole(mockBoard, 'editor-user')).toBe('editor');
    });
    it('should return viewer role for viewer', () => {
      expect(getUserRole(mockBoard, 'viewer-user')).toBe('viewer');
    });
    it('should return null for non-member', () => {
      expect(getUserRole(mockBoard, 'unknown-user')).toBeNull();
    });
  });

  describe('canUserEdit', () => {
    it('should return true for owner', () => {
      expect(canUserEdit(mockBoard, 'owner-user')).toBe(true);
    });
    it('should return true for editor', () => {
      expect(canUserEdit(mockBoard, 'editor-user')).toBe(true);
    });
    it('should return false for viewer', () => {
      expect(canUserEdit(mockBoard, 'viewer-user')).toBe(false);
    });
    it('should return false for non-member', () => {
      expect(canUserEdit(mockBoard, 'unknown-user')).toBe(false);
    });
  });

  describe('canUserManage', () => {
    it('should return true for owner', () => {
      expect(canUserManage(mockBoard, 'owner-user')).toBe(true);
    });
    it('should return false for editor', () => {
      expect(canUserManage(mockBoard, 'editor-user')).toBe(false);
    });
    it('should return false for viewer', () => {
      expect(canUserManage(mockBoard, 'viewer-user')).toBe(false);
    });
    it('should return false for non-member', () => {
      expect(canUserManage(mockBoard, 'unknown-user')).toBe(false);
    });
  });
});

// ======================================================================
// deleteBoard (transaction-based)
// ======================================================================

describe('boardService - deleteBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw when board does not exist', async () => {
    mockTxGet.mockResolvedValue(makeSnapshot(null));
    await expect(deleteBoard('missing-id', 'owner-user')).rejects.toThrow('Board not found');
    expect(mockTxDelete).not.toHaveBeenCalled();
  });

  it('should throw when user is not owner', async () => {
    mockTxGet.mockResolvedValue(makeSnapshot(mockBoard));
    await expect(deleteBoard('board-123', 'editor-user')).rejects.toThrow(
      'Only the board owner can delete the board'
    );
    expect(mockTxDelete).not.toHaveBeenCalled();
  });

  it('should delete when user is owner', async () => {
    mockTxGet.mockResolvedValue(makeSnapshot(mockBoard));
    await deleteBoard('board-123', 'owner-user');
    expect(mockTxGet).toHaveBeenCalled();
    expect(mockTxDelete).toHaveBeenCalled();
  });

  it('should throw when non-member tries to delete', async () => {
    mockTxGet.mockResolvedValue(makeSnapshot(mockBoard));
    await expect(deleteBoard('board-123', 'other-user')).rejects.toThrow(
      'Only the board owner can delete the board'
    );
    expect(mockTxDelete).not.toHaveBeenCalled();
  });
});

// ======================================================================
// removeBoardMember (transaction-based)
// ======================================================================

describe('boardService - removeBoardMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw when board does not exist', async () => {
    mockTxGet.mockResolvedValue(makeSnapshot(null));
    await expect(removeBoardMember('missing-id', 'editor-user')).rejects.toThrow('Board not found');
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('should throw when userId is the owner', async () => {
    mockTxGet.mockResolvedValue(makeSnapshot(mockBoard));
    await expect(removeBoardMember('board-123', 'owner-user')).rejects.toThrow(
      'Cannot remove the owner from the board'
    );
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('should remove member and update via transaction', async () => {
    mockTxGet.mockResolvedValue(makeSnapshot(mockBoard));
    await removeBoardMember('board-123', 'editor-user');
    expect(mockTxGet).toHaveBeenCalled();
    expect(mockTxUpdate).toHaveBeenCalledTimes(1);
    const updates = mockTxUpdate.mock.calls[0]?.[1] as { members: Record<string, string>; updatedAt: unknown };
    expect(updates.members).toEqual({
      'owner-user': 'owner',
      'viewer-user': 'viewer',
    });
    expect(updates.members['editor-user']).toBeUndefined();
    expect(updates.updatedAt).toBeDefined();
  });
});

// ======================================================================
// updateBoardName (transaction-based)
// ======================================================================

describe('boardService - updateBoardName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates board name when caller is owner', async () => {
    mockTxGet.mockResolvedValue(makeSnapshot(mockBoard));
    await updateBoardName('board-123', 'New Name', 'owner-user');
    expect(mockTxGet).toHaveBeenCalled();
    expect(mockTxUpdate).toHaveBeenCalledTimes(1);
    const updates = mockTxUpdate.mock.calls[0]?.[1] as { name: string; updatedAt: unknown };
    expect(updates).toMatchObject({ name: 'New Name' });
    expect(updates.updatedAt).toBeDefined();
  });

  it('throws when non-owner tries to rename', async () => {
    mockTxGet.mockResolvedValue(makeSnapshot(mockBoard));
    await expect(updateBoardName('board-123', 'New Name', 'editor-user')).rejects.toThrow(
      'Only the board owner can rename the board'
    );
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('throws when viewer tries to rename', async () => {
    mockTxGet.mockResolvedValue(makeSnapshot(mockBoard));
    await expect(updateBoardName('board-123', 'New Name', 'viewer-user')).rejects.toThrow(
      'Only the board owner can rename the board'
    );
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('throws when board is not found', async () => {
    mockTxGet.mockResolvedValue(makeSnapshot(null));
    await expect(updateBoardName('board-123', 'Name', 'owner-user')).rejects.toThrow('Board not found');
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });
});

// ======================================================================
// createBoard
// ======================================================================

describe('boardService - createBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates board with auto-generated id when no id provided', async () => {
    const board = await createBoard({ name: 'New Board', ownerId: 'user-1' });

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(board.name).toBe('New Board');
    expect(board.ownerId).toBe('user-1');
    expect(board.members['user-1']).toBe('owner');
    expect(board.id).toBeDefined();
  });

  it('creates board with explicit id', async () => {
    const board = await createBoard({ id: 'custom-id', name: 'Custom Board', ownerId: 'user-1' });

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(board.name).toBe('Custom Board');
    expect(board.ownerId).toBe('user-1');
    // The id comes from the doc ref
    expect(board.id).toBeDefined();
  });
});

// ======================================================================
// getBoard
// ======================================================================

describe('boardService - getBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns board when it exists', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockBoard,
    });

    const board = await getBoard('board-123');
    expect(board).toEqual(mockBoard);
  });

  it('returns null when board does not exist', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
      data: () => undefined,
    });

    const board = await getBoard('nonexistent');
    expect(board).toBeNull();
  });
});

// ======================================================================
// addBoardMember
// ======================================================================

describe('boardService - addBoardMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds new member to board', async () => {
    mockTxGet.mockResolvedValue(makeSnapshot(mockBoard));

    await addBoardMember('board-123', 'new-user', 'editor');

    expect(mockTxGet).toHaveBeenCalled();
    expect(mockTxUpdate).toHaveBeenCalledTimes(1);
    const updates = mockTxUpdate.mock.calls[0]?.[1] as { members: Record<string, string>; updatedAt: unknown };
    expect(updates.members['new-user']).toBe('editor');
    // Existing members preserved
    expect(updates.members['owner-user']).toBe('owner');
  });

  it('throws when board does not exist', async () => {
    mockTxGet.mockResolvedValue(makeSnapshot(null));

    await expect(addBoardMember('missing', 'user-1', 'editor')).rejects.toThrow('Board not found');
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });
});

// ======================================================================
// updateMemberRole
// ======================================================================

describe('boardService - updateMemberRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates member role successfully', async () => {
    mockTxGet.mockResolvedValue(makeSnapshot(mockBoard));

    await updateMemberRole('board-123', 'editor-user', 'viewer');

    expect(mockTxUpdate).toHaveBeenCalledTimes(1);
    const updates = mockTxUpdate.mock.calls[0]?.[1] as { members: Record<string, string> };
    expect(updates.members['editor-user']).toBe('viewer');
  });

  it('throws when trying to change owner role to non-owner', async () => {
    mockTxGet.mockResolvedValue(makeSnapshot(mockBoard));

    await expect(updateMemberRole('board-123', 'owner-user', 'editor')).rejects.toThrow(
      "Cannot change the owner's role"
    );
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('allows keeping owner as owner', async () => {
    mockTxGet.mockResolvedValue(makeSnapshot(mockBoard));

    await updateMemberRole('board-123', 'owner-user', 'owner');

    expect(mockTxUpdate).toHaveBeenCalledTimes(1);
  });

  it('throws when board does not exist', async () => {
    mockTxGet.mockResolvedValue(makeSnapshot(null));

    await expect(updateMemberRole('missing', 'editor-user', 'viewer')).rejects.toThrow('Board not found');
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });
});

// ======================================================================
// subscribeToBoard
// ======================================================================

describe('boardService - subscribeToBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls callback with board data when snapshot exists', () => {
    const callback = vi.fn();
    subscribeToBoard('board-123', callback);

    const snapshotCallback = mockOnSnapshot.mock.calls[0]?.[1] as
      | ((snapshot: { exists: () => boolean; data: () => IBoard | undefined }) => void)
      | undefined;

    snapshotCallback?.({
      exists: () => true,
      data: () => mockBoard,
    });

    expect(callback).toHaveBeenCalledWith(mockBoard);
  });

  it('calls callback with null when snapshot does not exist', () => {
    const callback = vi.fn();
    subscribeToBoard('board-123', callback);

    const snapshotCallback = mockOnSnapshot.mock.calls[0]?.[1] as
      | ((snapshot: { exists: () => boolean; data: () => IBoard | undefined }) => void)
      | undefined;

    snapshotCallback?.({
      exists: () => false,
      data: () => undefined,
    });

    expect(callback).toHaveBeenCalledWith(null);
  });
});

// ======================================================================
// subscribeToUserBoards
// ======================================================================

describe('boardService - subscribeToUserBoards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unique boards from snapshot (deduplication by id)', () => {
    const callback = vi.fn();
    subscribeToUserBoards('user-1', callback);

    const snapshotCallback = mockOnSnapshot.mock.calls[0]?.[1] as
      | ((snapshot: { docs: Array<{ id: string; data: () => Partial<IBoard> }> }) => void)
      | undefined;

    snapshotCallback?.({
      docs: [
        { id: 'board-1', data: () => ({ name: 'Board 1', ownerId: 'user-1', members: { 'user-1': 'owner' } }) },
        { id: 'board-1', data: () => ({ name: 'Board 1 dup', ownerId: 'user-1', members: { 'user-1': 'owner' } }) },
        { id: 'board-2', data: () => ({ name: 'Board 2', ownerId: 'user-2', members: { 'user-1': 'editor' } }) },
      ],
    });

    expect(callback).toHaveBeenCalledTimes(1);
    const boards = callback.mock.calls[0]?.[0] as IBoard[];
    expect(boards).toHaveLength(2);
    expect(boards[0]?.id).toBe('board-1');
    expect(boards[1]?.id).toBe('board-2');
  });
});
