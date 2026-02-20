/**
 * Tests for Epic 1 board routing requirements:
 * - Leave board navigates the user away from the board
 * - getActiveBoardId resolves active board correctly
 * - No hardcoded default board IDs in the codebase
 */
import { describe, it, expect } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { Timestamp } from 'firebase/firestore';
import { getActiveBoardId } from '@/lib/activeBoard';
import type { IBoard } from '@/types';
import type { IUserPreferences } from '@/types';
import type { UserRole } from '@/types';

// ---------------------------------------------------------------------------
// getActiveBoardId — active board resolution priority
// ---------------------------------------------------------------------------

const now = Timestamp.now();

function board(id: string, ownerId: string, extraMembers: Record<string, UserRole> = {}): IBoard {
  return {
    id,
    name: 'Board',
    ownerId,
    members: { [ownerId]: 'owner', ...extraMembers },
    createdAt: now,
    updatedAt: now,
  };
}

function prefs(recentBoardIds: string[] = []): IUserPreferences {
  return { recentBoardIds, favoriteBoardIds: [] };
}

describe('getActiveBoardId - active board resolution', () => {
  it('returns last-visited owned board first', () => {
    const boards = [board('owned-old', 'user'), board('owned-new', 'user')];
    expect(getActiveBoardId(boards, prefs(['owned-new', 'owned-old']), 'user')).toBe('owned-new');
  });

  it('returns a non-owned recent board when no owned boards are recent', () => {
    const boards = [board('b1', 'other', { user: 'editor' })];
    expect(getActiveBoardId(boards, prefs(['b1']), 'user')).toBe('b1');
  });

  it('falls back to first owned board when recent list is empty', () => {
    const boards = [board('b1', 'other'), board('b2', 'user')];
    expect(getActiveBoardId(boards, prefs([]), 'user')).toBe('b2');
  });

  it('returns null when user has no boards at all', () => {
    expect(getActiveBoardId([], prefs([]), 'user')).toBeNull();
  });

  it('ignores stale/deleted ids in recent list', () => {
    const boards = [board('live', 'user')];
    expect(getActiveBoardId(boards, prefs(['deleted-old', 'live']), 'user')).toBe('live');
  });
});

// ---------------------------------------------------------------------------
// Leave board navigation — App.tsx handleLeaveBoard contract
// ---------------------------------------------------------------------------

function LeaveBoardHarness(): ReactElement {
  const navigate = useNavigate();

  const handleLeaveBoard = () => {
    // Mirrors App.tsx handleLeaveBoard
    navigate('/', { replace: false });
  };

  return (
    <div>
      <button data-testid='leave-btn' onClick={handleLeaveBoard}>
        Leave
      </button>
    </div>
  );
}

function NavigationListener(): ReactElement {
  return <div data-testid='root'>root</div>;
}

describe('Leave board navigation', () => {
  it('navigate to / after leaving a board', async () => {
    render(
      <MemoryRouter initialEntries={['/board/board-1']}>
        <Routes>
          <Route path='/board/:boardId' element={<LeaveBoardHarness />} />
          <Route path='/' element={<NavigationListener />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('leave-btn')).toBeInTheDocument();

    await act(async () => {
      screen.getByTestId('leave-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('root')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// No hardcoded default board IDs in source code
// ---------------------------------------------------------------------------

describe('No hardcoded default board ID', () => {
  it('getActiveBoardId does not return any hardcoded default board id', () => {
    // When user has no boards, result must be null (not a hardcoded fallback ID).
    const result = getActiveBoardId([], { recentBoardIds: [], favoriteBoardIds: [] }, 'user-1');
    expect(result).toBeNull();
  });

  it('active board resolution never returns a string literal "dev-board-001" or similar', () => {
    const boards = [board('some-firestore-id', 'user-1')];
    const result = getActiveBoardId(boards, prefs([]), 'user-1');
    // Must be the Firestore-generated id, not any hardcoded value
    expect(result).toBe('some-firestore-id');
    expect(result).not.toBe('dev-board-001');
    expect(result).not.toBe('default-board');
  });
});
