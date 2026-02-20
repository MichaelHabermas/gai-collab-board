import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  getUserRole,
  canUserEdit,
  canUserManage,
  deleteBoard,
  removeBoardMember,
  updateBoardName,
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

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  onSnapshot: vi.fn(),
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
