import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Timestamp, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import {
  getUserRole,
  canUserEdit,
  canUserManage,
  deleteBoard,
  removeBoardMember,
  updateBoardName,
} from '@/modules/sync/boardService';
import { IBoard } from '@/types';

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(),
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 }),
  },
}));

vi.mock('@/lib/firebase', () => ({
  firestore: {},
}));

describe('boardService - Role Functions', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserRole', () => {
    it('should return owner role for owner', () => {
      const role = getUserRole(mockBoard, 'owner-user');
      expect(role).toBe('owner');
    });

    it('should return editor role for editor', () => {
      const role = getUserRole(mockBoard, 'editor-user');
      expect(role).toBe('editor');
    });

    it('should return viewer role for viewer', () => {
      const role = getUserRole(mockBoard, 'viewer-user');
      expect(role).toBe('viewer');
    });

    it('should return null for non-member', () => {
      const role = getUserRole(mockBoard, 'unknown-user');
      expect(role).toBeNull();
    });
  });

  describe('canUserEdit', () => {
    it('should return true for owner', () => {
      expect(canUserEdit(mockBoard, 'owner-user')).toBe(true);
    });

    it('should return true for editor', () => {
      expect(canUserEdit(mockBoard, 'editor-user')).toBe(true);
    });

    it('should return true for viewer (all board members can edit)', () => {
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

describe('boardService - deleteBoard', () => {
  const mockBoard: IBoard = {
    id: 'board-123',
    name: 'Test Board',
    ownerId: 'owner-user',
    members: {
      'owner-user': 'owner',
      'editor-user': 'editor',
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const mockGetDocSnapshot = (board: IBoard | null) => ({
    exists: () => board != null,
    data: () => (board != null ? board : undefined),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw when userId is provided and board does not exist', async () => {
    vi.mocked(getDoc).mockResolvedValue(mockGetDocSnapshot(null) as Awaited<ReturnType<typeof getDoc>>);
    await expect(deleteBoard('missing-id', 'owner-user')).rejects.toThrow('Board not found');
    expect(deleteDoc).not.toHaveBeenCalled();
  });

  it('should throw when userId is provided and user is not owner', async () => {
    vi.mocked(getDoc).mockResolvedValue(mockGetDocSnapshot(mockBoard) as Awaited<ReturnType<typeof getDoc>>);
    await expect(deleteBoard('board-123', 'editor-user')).rejects.toThrow(
      'Only the board owner can delete the board'
    );
    expect(deleteDoc).not.toHaveBeenCalled();
  });

  it('should call deleteDoc when userId is provided and user is owner', async () => {
    vi.mocked(getDoc).mockResolvedValue(mockGetDocSnapshot(mockBoard) as Awaited<ReturnType<typeof getDoc>>);
    vi.mocked(deleteDoc).mockResolvedValue(undefined as never);
    await deleteBoard('board-123', 'owner-user');
    expect(getDoc).toHaveBeenCalled();
    expect(deleteDoc).toHaveBeenCalled();
  });

  it('should throw when userId is provided and user is not owner', async () => {
    vi.mocked(getDoc).mockResolvedValue(mockGetDocSnapshot(mockBoard) as Awaited<ReturnType<typeof getDoc>>);
    await expect(deleteBoard('board-123', 'other-user')).rejects.toThrow(
      'Only the board owner can delete the board'
    );
    expect(deleteDoc).not.toHaveBeenCalled();
  });
});

describe('boardService - removeBoardMember', () => {
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

  const mockGetDocSnapshot = (board: IBoard | null) => ({
    exists: () => board != null,
    data: () => (board != null ? board : undefined),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updateDoc).mockResolvedValue(undefined as never);
  });

  it('should throw when board does not exist', async () => {
    vi.mocked(getDoc).mockResolvedValue(mockGetDocSnapshot(null) as Awaited<ReturnType<typeof getDoc>>);
    await expect(removeBoardMember('missing-id', 'editor-user')).rejects.toThrow('Board not found');
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('should throw when userId is the owner', async () => {
    vi.mocked(getDoc).mockResolvedValue(mockGetDocSnapshot(mockBoard) as Awaited<ReturnType<typeof getDoc>>);
    await expect(removeBoardMember('board-123', 'owner-user')).rejects.toThrow(
      'Cannot remove the owner from the board'
    );
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('should call updateDoc with members without userId when user is not owner', async () => {
    vi.mocked(getDoc).mockResolvedValue(mockGetDocSnapshot(mockBoard) as Awaited<ReturnType<typeof getDoc>>);
    await removeBoardMember('board-123', 'editor-user');
    expect(getDoc).toHaveBeenCalled();
    expect(updateDoc).toHaveBeenCalledTimes(1);
    const call = vi.mocked(updateDoc).mock.calls[0];
    if (call == null || call[1] == null) {
      throw new Error('updateDoc expected to be called with (ref, updates)');
    }
    const updates = call[1] as unknown as { members: Record<string, string>; updatedAt: unknown };
    expect(updates.members).toEqual({
      'owner-user': 'owner',
      'viewer-user': 'viewer',
    });
    expect(updates.members['editor-user']).toBeUndefined();
    expect(updates.updatedAt).toBeDefined();
  });
});

describe('boardService - updateBoardName', () => {
  const mockBoardForRename: IBoard = {
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

  const mockBoardSnapshot = {
    exists: () => true,
    data: () => mockBoardForRename,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDoc).mockResolvedValue(mockBoardSnapshot as never);
    vi.mocked(updateDoc).mockResolvedValue(undefined as never);
  });

  it('updates board name and updatedAt when caller is owner', async () => {
    await updateBoardName('board-123', 'New Name', 'owner-user');

    expect(getDoc).toHaveBeenCalled();
    expect(updateDoc).toHaveBeenCalledTimes(1);
    const call = vi.mocked(updateDoc).mock.calls[0];
    if (call == null || call[1] == null) {
      throw new Error('updateDoc expected to be called with (ref, updates)');
    }
    const updates = call[1] as unknown as { name: string; updatedAt: unknown };
    expect(updates).toMatchObject({
      name: 'New Name',
    });
    expect(updates.updatedAt).toBeDefined();
  });

  it('throws when non-owner tries to rename', async () => {
    await expect(
      updateBoardName('board-123', 'New Name', 'editor-user')
    ).rejects.toThrow('Only the board owner can rename the board');
    expect(getDoc).toHaveBeenCalled();
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('throws when viewer tries to rename', async () => {
    await expect(
      updateBoardName('board-123', 'New Name', 'viewer-user')
    ).rejects.toThrow('Only the board owner can rename the board');
    expect(getDoc).toHaveBeenCalled();
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('throws when board is not found', async () => {
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => false,
      data: () => undefined,
    } as never);

    await expect(
      updateBoardName('board-123', 'Name', 'owner-user')
    ).rejects.toThrow('Board not found');
    expect(updateDoc).not.toHaveBeenCalled();
  });
});
