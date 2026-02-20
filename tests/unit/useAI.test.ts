import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import type { IBoardObject } from '@/types';
import { useAI } from '@/hooks/useAI';
import { AIError } from '@/modules/ai/errors';
import { useViewportActionsStore } from '@/stores/viewportActionsStore';
import type { IViewportActionsValue } from '@/types';

const {
  mockCreateObject,
  mockUpdateObject,
  mockDeleteObject,
  mockDeleteObjectsBatch,
  mockCreateToolExecutor,
  mockExecute,
  mockProcessCommand,
  mockUpdateBoardState,
  mockAIServiceConstructor,
} = vi.hoisted(() => ({
  mockCreateObject: vi.fn(),
  mockUpdateObject: vi.fn(),
  mockDeleteObject: vi.fn(),
  mockDeleteObjectsBatch: vi.fn(),
  mockCreateToolExecutor: vi.fn(),
  mockExecute: vi.fn(),
  mockProcessCommand: vi.fn(),
  mockUpdateBoardState: vi.fn(),
  mockAIServiceConstructor: vi.fn(),
}));

vi.mock('@/modules/sync/objectService', () => ({
  createObject: mockCreateObject,
  updateObject: mockUpdateObject,
  deleteObject: mockDeleteObject,
  deleteObjectsBatch: mockDeleteObjectsBatch,
}));

vi.mock('@/modules/ai', () => ({
  createToolExecutor: mockCreateToolExecutor,
  AIService: mockAIServiceConstructor,
}));

const buildUser = (overrides: Partial<User> = {}): User =>
  ({
    uid: overrides.uid ?? 'user-1',
    email: overrides.email ?? 'user@example.com',
    displayName: overrides.displayName ?? 'User One',
  }) as User;

const buildObject = (overrides: Partial<IBoardObject> = {}): IBoardObject =>
  ({
    id: overrides.id ?? 'obj-1',
    type: overrides.type ?? 'sticky',
    x: overrides.x ?? 10,
    y: overrides.y ?? 20,
    width: overrides.width ?? 120,
    height: overrides.height ?? 80,
    rotation: overrides.rotation ?? 0,
    fill: overrides.fill ?? '#fef08a',
    createdBy: overrides.createdBy ?? 'user-1',
    createdAt: overrides.createdAt ?? ({ toMillis: () => 0 } as IBoardObject['createdAt']),
    updatedAt: overrides.updatedAt ?? ({ toMillis: () => 0 } as IBoardObject['updatedAt']),
    text: overrides.text ?? '',
    stroke: overrides.stroke,
    strokeWidth: overrides.strokeWidth,
    textFill: overrides.textFill,
    fontSize: overrides.fontSize,
    opacity: overrides.opacity,
    points: overrides.points,
    fromObjectId: overrides.fromObjectId,
    toObjectId: overrides.toObjectId,
    fromAnchor: overrides.fromAnchor,
    toAnchor: overrides.toAnchor,
  }) as IBoardObject;

const buildViewportActions = (): IViewportActionsValue => ({
  zoomToFitAll: vi.fn(),
  zoomToSelection: vi.fn(),
  setZoomLevel: vi.fn(),
  exportViewport: vi.fn(),
  exportFullBoard: vi.fn(),
});

/** Push viewport actions into the Zustand store (replaces Context wrapper). */
const setStoreViewportActions = (actions: IViewportActionsValue | null): void => {
  useViewportActionsStore.getState().setActions(actions);
};

describe('useAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setStoreViewportActions(null);

    mockCreateToolExecutor.mockReturnValue({
      execute: mockExecute,
    });

    mockAIServiceConstructor.mockImplementation(
      function MockAIService() {
        return {
          processCommand: mockProcessCommand,
          updateBoardState: mockUpdateBoardState,
        };
      }
    );
  });

  it('builds tool executor with viewport callbacks when store has actions', () => {
    const viewportActions = buildViewportActions();
    setStoreViewportActions(viewportActions);

    renderHook(() =>
      useAI({
        boardId: 'board-1',
        user: buildUser(),
        objects: [buildObject()],
      })
    );

    expect(mockCreateToolExecutor).toHaveBeenCalledWith(
      expect.objectContaining({
        boardId: 'board-1',
        createdBy: 'user-1',
        userId: 'user-1',
        createObject: mockCreateObject,
        updateObject: mockUpdateObject,
        deleteObject: mockDeleteObject,
        onZoomToFitAll: viewportActions.zoomToFitAll,
        onZoomToSelection: viewportActions.zoomToSelection,
        onSetZoomLevel: viewportActions.setZoomLevel,
        onExportViewport: viewportActions.exportViewport,
        onExportFullBoard: viewportActions.exportFullBoard,
      })
    );
  });

  it('processes a successful command and appends user + assistant messages', async () => {
    mockProcessCommand.mockResolvedValue('Created one sticky note');

    const { result } = renderHook(() =>
      useAI({
        boardId: 'board-1',
        user: buildUser(),
        objects: [],
      })
    );

    await act(async () => {
      await result.current.processCommand('  create one sticky  ');
    });

    expect(mockProcessCommand).toHaveBeenCalledWith('create one sticky');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
    expect(result.current.messages).toEqual([
      { role: 'user', content: 'create one sticky' },
      { role: 'assistant', content: 'Created one sticky note' },
    ]);
  });

  it('sets normalized error message on command failure (e.g. 503)', async () => {
    mockProcessCommand.mockRejectedValue(new AIError('Provider unavailable', 'provider_error', 503));

    const { result } = renderHook(() =>
      useAI({
        boardId: 'board-1',
        user: buildUser(),
        objects: [],
      })
    );

    await act(async () => {
      await result.current.processCommand('create board');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toMatch(/temporarily unavailable|Retry/);
    expect(result.current.messages).toEqual([{ role: 'user', content: 'create board' }]);
  });

  it('uses normalized message for non-Error failures', async () => {
    mockProcessCommand.mockRejectedValue('untyped-failure');

    const { result } = renderHook(() =>
      useAI({
        boardId: 'board-1',
        user: buildUser(),
        objects: [],
      })
    );

    await act(async () => {
      await result.current.processCommand('do something');
    });

    expect(result.current.error).toBe('untyped-failure');
  });

  it('ignores empty commands or unavailable service', async () => {
    const { result: noServiceResult } = renderHook(() =>
      useAI({
        boardId: null,
        user: null,
        objects: [],
      })
    );

    await act(async () => {
      await noServiceResult.current.processCommand('create sticky');
      await noServiceResult.current.processCommand('   ');
    });

    expect(mockProcessCommand).not.toHaveBeenCalled();
    expect(noServiceResult.current.messages).toEqual([]);
    expect(noServiceResult.current.error).toBe('');
  });

  it('updates board state when objects change and supports clear helpers', async () => {
    const firstObjects = [buildObject({ id: 'obj-a' })];
    const secondObjects = [buildObject({ id: 'obj-b' }), buildObject({ id: 'obj-c' })];

    const { result, rerender } = renderHook(
      ({ objects }) =>
        useAI({
          boardId: 'board-1',
          user: buildUser(),
          objects,
        }),
      {
        initialProps: { objects: firstObjects },
      }
    );

    await waitFor(() => {
      expect(mockUpdateBoardState).toHaveBeenCalledWith(firstObjects);
    });

    rerender({ objects: secondObjects });

    await waitFor(() => {
      expect(mockUpdateBoardState).toHaveBeenCalledWith(secondObjects);
    });

    mockProcessCommand.mockResolvedValue('Done');

    await act(async () => {
      await result.current.processCommand('test');
    });

    act(() => {
      result.current.clearError();
      result.current.clearMessages();
    });

    expect(result.current.error).toBe('');
    expect(result.current.messages).toEqual([]);
  });

  it('does not recreate AI service when viewport store actions keep same references', () => {
    const zoomToFitAll = vi.fn();
    const zoomToSelection = vi.fn();
    const setZoomLevel = vi.fn();
    const exportViewport = vi.fn();
    const exportFullBoard = vi.fn();

    setStoreViewportActions({
      zoomToFitAll,
      zoomToSelection,
      setZoomLevel,
      exportViewport,
      exportFullBoard,
    });

    const { rerender } = renderHook(() =>
      useAI({
        boardId: 'board-1',
        user: buildUser(),
        objects: [buildObject()],
      })
    );

    expect(mockAIServiceConstructor).toHaveBeenCalledTimes(1);

    // Re-set with same function references — should not trigger recreation
    setStoreViewportActions({
      zoomToFitAll,
      zoomToSelection,
      setZoomLevel,
      exportViewport,
      exportFullBoard,
    });
    rerender();

    expect(mockAIServiceConstructor).toHaveBeenCalledTimes(1);
  });
});
