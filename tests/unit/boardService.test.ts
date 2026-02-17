import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { getUserRole, canUserEdit, canUserManage } from '@/modules/sync/boardService';
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
