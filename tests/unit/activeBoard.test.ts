import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { getActiveBoardId } from '@/lib/activeBoard';
import type { IBoard } from '@/types';
import type { IUserPreferences } from '@/types';

const now = Timestamp.now();

function board(id: string, ownerId: string): IBoard {
  return {
    id,
    name: 'Board',
    ownerId,
    members: { [ownerId]: 'owner' },
    createdAt: now,
    updatedAt: now,
  };
}

describe('getActiveBoardId', () => {
  const userId = 'user-1';

  it('returns first recent board id that user owns', () => {
    const boards: IBoard[] = [
      board('a', 'other'),
      board('b', userId),
      board('c', userId),
    ];
    const preferences: IUserPreferences = { recentBoardIds: ['a', 'c', 'b'], favoriteBoardIds: [] };
    expect(getActiveBoardId(boards, preferences, userId)).toBe('c');
  });

  it('returns first recent board id user is member of when none owned in recent', () => {
    const boards: IBoard[] = [
      board('a', 'other'),
      board('b', 'other'),
    ];
    const preferences: IUserPreferences = { recentBoardIds: ['b', 'a'], favoriteBoardIds: [] };
    expect(getActiveBoardId(boards, preferences, userId)).toBe('b');
  });

  it('returns first owned board when recent is empty', () => {
    const boards: IBoard[] = [
      board('x', 'other'),
      board('y', userId),
      board('z', userId),
    ];
    const preferences: IUserPreferences = { recentBoardIds: [], favoriteBoardIds: [] };
    expect(getActiveBoardId(boards, preferences, userId)).toBe('y');
  });

  it('returns null when user has no boards', () => {
    const boards: IBoard[] = [];
    const preferences: IUserPreferences = { recentBoardIds: [], favoriteBoardIds: [] };
    expect(getActiveBoardId(boards, preferences, userId)).toBeNull();
  });

  it('returns null when user is only member (not owner) and recent ids do not match any board', () => {
    const boards: IBoard[] = [board('only', 'other')];
    const preferences: IUserPreferences = { recentBoardIds: ['deleted-id'], favoriteBoardIds: [] };
    expect(getActiveBoardId(boards, preferences, userId)).toBeNull();
  });

  it('skips recent ids that are not in boards list', () => {
    const boards: IBoard[] = [board('real', userId)];
    const preferences: IUserPreferences = {
      recentBoardIds: ['deleted-1', 'real', 'deleted-2'],
      favoriteBoardIds: [],
    };
    expect(getActiveBoardId(boards, preferences, userId)).toBe('real');
  });
});
